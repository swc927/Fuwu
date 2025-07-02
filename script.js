function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function createVerticalNameDiv(name, defaultFontSize) {
  name = name.replace(/\((.*?)\)/g, "（$1）");

  const div = document.createElement("div");
  div.className = "vertical-name";

  let customFontSize = defaultFontSize;
  const chineseOnly = name.replace(/[^\u4e00-\u9fa5]/g, "");
  const length = chineseOnly.length;

  if (length >= 13 && parseInt(defaultFontSize) > 30) {
    customFontSize = "40px";
  } else if (length >= 11 && parseInt(defaultFontSize) > 40) {
    customFontSize = "50px";
  } else if (length >= 7 && parseInt(defaultFontSize) > 60) {
    customFontSize = "60px";
  } else if (length >= 5 && parseInt(defaultFontSize) > 90) {
    customFontSize = "90px";
  }

  div.style.fontSize = customFontSize;

  const isMixed = /[\u4e00-\u9fa5]/.test(name) && /[A-Za-z]/.test(name);

  if (isMixed) {
    name.split("").forEach((char) => {
      const span = document.createElement("span");
      span.textContent = char;

      if (/[A-Za-z]/.test(char)) {
        span.style.writingMode = "horizontal-tb";
        span.style.display = "inline-block";
      } else if (/[\(\)（）]/.test(char)) {
        span.style.display = "inline-block";
      }

      div.appendChild(span);
    });
  } else {
    [...name].forEach((char) => {
      const span = document.createElement("span");
      span.textContent = char;

      if (/[\(\)（）]/.test(char)) {
        span.classList.add("rotated-bracket");
      }

      div.appendChild(span);
    });
  }

  return div;
}

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").innerHTML = "";
}

function createVerticalNameDivWithTitle(name, defaultFontSize) {
  const knownTitles = [
    "PBM",
    "BBM",
    "BBM(L)",
    "PPA(G)",
    "PPA(P)",
    "JP",
    "JP(P)",
    "DMM",
  ];
  const div = document.createElement("div");
  div.className = "vertical-name";

  const match = name.match(/^([\u4e00-\u9fa5]+)([A-Z()]+)$/);
  if (match) {
    const chineseName = match[1];
    const title = match[2];

    const verticalPart = createVerticalNameDiv(chineseName, defaultFontSize);
    const titleDiv = document.createElement("div");
    titleDiv.className = "horizontal-letter";
    titleDiv.textContent = title;
    titleDiv.style.fontSize = "40px";
    titleDiv.style.textAlign = "center";
    titleDiv.style.marginTop = "10px";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.appendChild(verticalPart);
    container.appendChild(titleDiv);
    return container;
  }

  return createVerticalNameDiv(name, defaultFontSize);
}

function fixChineseCompanySplitRender() {
  const topSuffixRE =
    /(集團|有限公司|有限责任公司|私人有限公司|公司|中心|會館|學校|表行|農場|茶莊|餐馆|面包店|蝦餅)$/;

  document.querySelectorAll(".output-page").forEach((page) => {
    const topZone = page.querySelector(".top-zone");
    const middleZone = page.querySelector(".middle-zone");

    const topNames = Array.from(topZone.querySelectorAll("div"))
      .map((div) => div.textContent.trim())
      .filter((text) => topSuffixRE.test(text));

    const hasVerticalNames = middleZone.querySelector(".vertical-name");
    const hasEnglish = middleZone.querySelector(".english");
    const hasHeJia = middleZone.textContent.includes("合家");

    if (
      topNames.length > 0 &&
      topNames.length <= 3 &&
      !hasVerticalNames &&
      !hasEnglish &&
      !hasHeJia
    ) {
      topNames.forEach((companyName) => {
        const matchingDiv = Array.from(topZone.querySelectorAll("div")).find(
          (d) => d.textContent.trim() === companyName
        );
        if (matchingDiv) {
          topZone.removeChild(matchingDiv);
        }

        const newDiv = createVerticalNameDivWithTitle(companyName, "60px");
        newDiv.style.margin = "0 15px";

        let fixedRow = page.querySelector(
          ".middle-zone.chinese-wrapper.fixed-reinsert"
        );
        if (!fixedRow) {
          fixedRow = document.createElement("div");
          fixedRow.className = "middle-zone chinese-wrapper fixed-reinsert";
          fixedRow.style.alignItems = "center";
          middleZone.appendChild(fixedRow);
        }

        fixedRow.appendChild(newDiv);
      });
    }
  });
}

function splitEnglishNameSmartly(name) {
  const words = name.trim().split(/\s+/);
  if (words.length !== 4) return null;

  const [w1, w2, w3, w4] = words;

  const firstIsNickname = w1.length > w4.length;
  if (firstIsNickname) {
    return {
      top: w1,
      bottom: [w2, w3, w4].join(" "),
    };
  } else {
    return {
      top: [w1, w2, w3].join(" "),
      bottom: w4,
    };
  }
}

function paginateChineseNames(chineseNames, maxPerPage = 70) {
  const pages = [];
  for (let i = 0; i < chineseNames.length; i += maxPerPage) {
    pages.push(chineseNames.slice(i, i + maxPerPage));
  }
  return pages;
}

function generate() {
  const rawInput = document.getElementById("input").value.trim();
  const cleanInput = rawInput.replace(/&\s*\n\s*/g, "& ");

  const pageBlocks = cleanInput
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const output = document.getElementById("output");
  output.innerHTML = "";

  pageBlocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let topNames = [];
    let middleChinese = [];
    let middleEnglish = [];
    let hasHeJia = false;
    let topNamesSet = new Set();

    const zhCompanyRE =
      /(集團|有限公司|有限责任公司|私人有限公司|表行|茶莊|農場|公司|中心|會館|學校|新記|餐馆|面包店|蝦餅)$/;
    const enSuffixes = [
      "Pte\\.?\\sLtd\\.?",
      "Ltd\\.?",
      "Sdn\\.?\\sBhd\\.?",
      "Corporation",
      "Company",
      "Inc\\.?",
      "LLP",
      "PLC",

      "Construction",
      "Graphics",
      "Engineering",
      "Renovation\\sWorks",
      "Trading",
      "Services",
      "Hacking\\s&\\sRenovation\\sWorks",
    ];

    const enSuffixRE = new RegExp(`(${enSuffixes.join("|")})$`, "i");
    const commaSplitRE = /[,，]+/;

    lines.forEach((line) => {
      line.split(commaSplitRE).forEach((chunk) => {
        const tokens = chunk.trim().split(/\s+/).filter(Boolean);
        const joined = tokens.join(" ");
        const capitalisedWords = tokens.filter((w) =>
          /^[A-Z&][a-zA-Z&]*$/.test(w)
        );

        let bestCompanyIdx = -1;
        let bestCompanyName = "";

        for (let i = 0; i < tokens.length; i++) {
          const slice = tokens.slice(i).join(" ");
          if (enSuffixRE.test(slice)) {
            bestCompanyIdx = i;
            bestCompanyName = slice;
            break;
          }
        }

        if (bestCompanyIdx >= 0) {
          const donors = tokens.slice(0, bestCompanyIdx);
          const cleanCompany = bestCompanyName.trim();

          if (
            !topNames.some(
              (n) => n.trim().toLowerCase() === cleanCompany.toLowerCase()
            )
          ) {
            topNames.push(cleanCompany);
            topNamesSet.add(cleanCompany.toLowerCase());
          }

          if (donors.length > 0) {
            const donorName = donors.join(" ").trim();
            if (donorName) {
              middleEnglish.push(donorName);
            }
          }

          return;
        }

        if (
          capitalisedWords.length >= 3 &&
          /Renovation|Construction|Engineering|Works|Services|Trading|Design|Hacking|Interior|Builder|Cleaning|Maintenance|Graphics/i.test(
            joined
          )
        ) {
          if (!topNames.includes(joined)) topNames.push(joined);
          return;
        }

        if (!tokens.length) return;

        let bestCompanyMatch = null;
        let matchStart = -1;
        let matchEnd = -1;

        for (let start = 0; start < tokens.length; start++) {
          let candidate = "";
          for (let end = start; end < tokens.length; end++) {
            const slice = tokens.slice(start, end + 1).join("");
            if (zhCompanyRE.test(slice)) {
              bestCompanyMatch = slice;
              matchStart = start;
              matchEnd = end;
            }
          }
        }

        if (bestCompanyMatch) {
          const companyTokens = tokens.slice(matchStart, matchEnd + 1);
          const donorTokens = tokens
            .slice(0, matchStart)
            .concat(tokens.slice(matchEnd + 1));
          const company = companyTokens.join("");
          const cleanCompany = company.trim();
          if (
            !topNames.some(
              (n) => n.trim().toLowerCase() === cleanCompany.toLowerCase()
            )
          ) {
            topNames.push(cleanCompany);
            topNamesSet.add(cleanCompany.toLowerCase());
          }
          donorTokens.forEach(classifyToken);
          return;
        }

        let buffer = [];
        tokens.forEach((word, idx) => {
          buffer.push(word);
          if (enSuffixRE.test(buffer.join(" "))) {
            const name = buffer.join(" ");
            const cleanName = name.trim();
            const normalised = cleanName.toLowerCase();

            if (
              !topNamesSet.has(normalised) &&
              !middleEnglish.includes(cleanName)
            ) {
              topNames.push(cleanName);
              topNamesSet.add(normalised);
            }

            buffer.length = 0;
            return;
          }

          if (idx === tokens.length - 1 && buffer.length >= 2) {
            const allCapitalised = buffer.every((w) =>
              /^[A-Z][a-zA-Z]+$/.test(w)
            );
            if (allCapitalised) {
              const name = buffer.join(" ");
              const cleanName = name.trim();
              if (
                !topNames.some(
                  (n) => n.trim().toLowerCase() === cleanName.toLowerCase()
                )
              ) {
                topNames.push(cleanName);
              }
              buffer = [];
              return;
            }
          }
        });

        if (buffer.length > 0) {
          buffer.forEach(classifyToken);
        }
      });
    });

    topNames = [...new Set(topNames.map((n) => n.trim()))];

    middleEnglish = [...new Set(middleEnglish.map((n) => n.trim()))].filter(
      (name) => {
        const norm = name.trim().toLowerCase();
        return !topNames.some(
          (top) =>
            top.trim().toLowerCase() === norm ||
            top.trim().toLowerCase().includes(norm) ||
            norm.includes(top.trim().toLowerCase())
        );
      }
    );

    document.getElementById("output").scrollIntoView({ behavior: "smooth" });

    if (
      middleChinese.length === 0 &&
      !hasHeJia &&
      middleEnglish.length >= 3 &&
      middleEnglish.every((word) => /^[A-Z][a-z]+$/.test(word))
    ) {
      middleEnglish = [middleEnglish.join(" ")];
    }

    function classifyToken(tok) {
      if (!tok) return;

      if (tok.includes("合家")) {
        hasHeJia = true;
        const donor = tok.replace("合家", "").trim();
        if (donor) middleChinese.push(donor);
        return;
      }

      if (
        /^[A-Za-z0-9\s&,.]+$/.test(tok) &&
        /\b(Pte\.?\s?Ltd\.?|Ltd\.?|Sdn\.?\s?Bhd\.?|Inc\.?|LLP|PLC|Corporation|Company)\b/i.test(
          tok
        )
      ) {
        const cleanTok = tok.trim();
        const normalised = cleanTok.toLowerCase();
        if (
          !topNamesSet.has(normalised) &&
          !middleEnglish.some((n) => n.trim().toLowerCase() === normalised)
        ) {
          middleEnglish.push(cleanTok);
        }
        return;
      }

      if (!isChinese(tok) && /[A-Za-z]/.test(tok)) {
        const cleanTok = tok.trim().toLowerCase();
        if (!topNamesSet.has(cleanTok)) {
          middleEnglish.push(tok);
        }
        return;
      }

      if (isChinese(tok)) {
        middleChinese.push(tok);
      } else {
        middleEnglish.push(tok);
      }
    }

    const wrapper = document.createElement("div");
    wrapper.className = "output-wrapper";

    const page = document.createElement("div");
    page.className = "output-page";
    Object.assign(page.style, {
      width: "2480px",
      height: "1754px",
      backgroundImage: "url('Fuwu.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "40px",
      position: "relative",
    });

    if (
      middleChinese.length === 0 &&
      middleEnglish.length === 0 &&
      !hasHeJia &&
      topNames.length > 0
    ) {
      topNames.forEach((name) => {
        if (/[\u4e00-\u9fff]/.test(name)) {
          middleChinese.push(name);
        } else {
          middleEnglish.push(name);
        }
      });
      topNames = [];
    }

    const topZone = document.createElement("div");
    topZone.className = "zone top-zone";
    if (topNames.length > 0) {
      topNames = topNames.filter((name) => {
        const norm = name.trim().toLowerCase();
        return !middleEnglish.some(
          (middle) =>
            middle.trim().toLowerCase() === norm ||
            middle.trim().toLowerCase().includes(norm) ||
            norm.includes(middle.trim().toLowerCase())
        );
      });

      topNames.forEach((name) => {
        const div = document.createElement("div");
        div.textContent = name;

        if (name.length >= 50) {
          div.style.fontSize = "30px";
        } else if (name.length >= 40) {
          div.style.fontSize = "34px";
        } else if (name.length >= 30) {
          div.style.fontSize = "36px";
        } else {
          div.style.fontSize = "40px";
        }

        topZone.appendChild(div);
      });

      middleEnglish = middleEnglish.filter((name) => {
        const normalised = name.trim().toLowerCase();
        return !topNames.some((top) => {
          const topNorm = top.trim().toLowerCase();
          return (
            normalised === topNorm ||
            normalised.includes(topNorm) ||
            topNorm.includes(normalised)
          );
        });
      });
    }

    const middleZone = document.createElement("div");
    middleZone.className = "zone middle-zone";
    if (topNames.length === 0) {
      middleZone.classList.add("no-top");
    }

    const chinesePages = paginateChineseNames(middleChinese, 70);
    chinesePages.forEach((subset, pageIndex) => {
      let row1 = [],
        row2 = [],
        row3 = [],
        row4 = [],
        row5 = [];
      let chineseFontSize = "40px";

      if (subset.length <= 2) {
        row1 = subset;
        chineseFontSize = "120px";
      } else if (subset.length <= 4) {
        row1 = subset;
        chineseFontSize = "100px";
      } else if (subset.length <= 13) {
        const half = Math.ceil(subset.length / 2);
        row1 = subset.slice(0, half);
        row2 = subset.slice(half);
        chineseFontSize = "60px";
      } else if (subset.length <= 18) {
        const third = Math.ceil(subset.length / 3);
        row1 = subset.slice(0, third);
        row2 = subset.slice(third, third * 2);
        row3 = subset.slice(third * 2);
        chineseFontSize = "48px";
      } else if (subset.length <= 24) {
        const third = Math.ceil(subset.length / 3);
        row1 = subset.slice(0, third);
        row2 = subset.slice(third, third * 2);
        row3 = subset.slice(third * 2);
        chineseFontSize = "42px";
      } else if (subset.length <= 36) {
        const quarter = Math.ceil(subset.length / 4);
        row1 = subset.slice(0, quarter);
        row2 = subset.slice(quarter, quarter * 2);
        row3 = subset.slice(quarter * 2, quarter * 3);
        row4 = subset.slice(quarter * 3);
        chineseFontSize = "36px";
      } else {
        const fifth = Math.ceil(subset.length / 5);
        row1 = subset.slice(0, fifth);
        row2 = subset.slice(fifth, fifth * 2);
        row3 = subset.slice(fifth * 2, fifth * 3);
        row4 = subset.slice(fifth * 3, fifth * 4);
        row5 = subset.slice(fifth * 4);
        chineseFontSize = "32px";
      }

      const rows = [row1, row2, row3, row4, row5];
      rows.forEach((row, idx) => {
        if (row.length === 0) return;
        const div = document.createElement("div");
        div.className = "middle-zone chinese-wrapper";
        if (row5.length > 0) {
          div.style.marginTop = idx === 0 ? "80px" : "10px";
          div.style.gap = "5px";
        }
        row.forEach((name) => {
          div.appendChild(
            createVerticalNameDivWithTitle(name, chineseFontSize)
          );
        });
        middleZone.appendChild(div);
      });
    });

    if (
      middleChinese.length === 0 &&
      middleEnglish.length === 1 &&
      !hasHeJia &&
      middleEnglish[0].split(/\s+/).length === 4
    ) {
      const smartSplit = splitEnglishNameSmartly(middleEnglish[0].trim());

      if (smartSplit) {
        const divTop = document.createElement("div");
        divTop.className = "corporate-only-centre";
        divTop.textContent = smartSplit.top;

        const divBottom = document.createElement("div");
        divBottom.className = "corporate-only-centre";
        divBottom.textContent = smartSplit.bottom;

        [divTop, divBottom].forEach((div) => {
          div.style.fontSize = "70px";
          div.style.fontWeight = "bold";
          div.style.textAlign = "center";
          div.style.marginTop = "5px";
          div.style.lineHeight = "1.2";
        });

        middleZone.appendChild(divTop);
        middleZone.appendChild(divBottom);
      }

      middleEnglish = [];
    }

    if (middleEnglish.length > 0) {
      const englishWrapper = document.createElement("div");
      englishWrapper.className = "middle-zone";

      if (middleChinese.length > 0) {
        englishWrapper.style.marginTop = "10px";
      }

      middleEnglish.forEach((name) => {
        const div = document.createElement("div");
        div.className = "english";
        div.textContent = name;
        englishWrapper.appendChild(div);
      });

      middleZone.appendChild(englishWrapper);
    }

    const bottomZone = document.createElement("div");
    bottomZone.className = "zone bottom-zone";
    if (hasHeJia) {
      const div = document.createElement("div");
      div.textContent = "合家";

      const totalMiddle = middleChinese.length + middleEnglish.length;
      const middleWrappers = middleZone.querySelectorAll(
        ".middle-zone.chinese-wrapper"
      );
      const middleRows = middleWrappers.length;

      if (totalMiddle <= 13) {
        const middleRows = middleZone.querySelectorAll(
          ".middle-zone.chinese-wrapper"
        ).length;

        const divStyle = {
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "99",
          padding: "0 20px",
        };

        if (middleRows <= 2) {
          const base = 410;
          const boost = Math.min((13 - totalMiddle) * 5, 110);
          divStyle.bottom = "20px";
        } else {
          divStyle.bottom = "410px";
        }

        Object.assign(div.style, divStyle);
      }

      bottomZone.appendChild(div);
    }

    page.appendChild(topZone);
    page.appendChild(middleZone);
    page.appendChild(bottomZone);
    wrapper.appendChild(page);
    output.appendChild(wrapper);
  });
}

function exportToPDF() {
  const pages = document.querySelectorAll(".output-page");
  const wrappers = document.querySelectorAll(".output-wrapper");

  wrappers.forEach((wrapper) => {
    wrapper.style.transform = "none";
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [2480, 1754],
  });

  let currentIndex = 0;

  function captureNextPage() {
    if (currentIndex >= pages.length) {
      wrappers.forEach((wrapper) => {
        wrapper.style.transform = "scale(0.4)";
        wrapper.style.transformOrigin = "top left";
      });

      pdf.save("Fuwu.pdf");
      return;
    }

    const currentPage = pages[currentIndex];

    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.body.classList.add("pdf-mode");

          html2canvas(currentPage, {
            allowTaint: true,
            useCORS: true,
            scale: 2,
            scrollY: -window.scrollY,
            backgroundColor: null,
            windowWidth: 2480,
            windowHeight: 1754,
          }).then((canvas) => {
            const imgData = canvas.toDataURL("image/jpeg", 1.0);

            if (currentIndex > 0) {
              pdf.addPage();
            }

            pdf.addImage(imgData, "JPEG", 0, 0, 2480, 1754);
            currentIndex++;
            captureNextPage();
          });
          document.body.classList.remove("pdf-mode");
        }, 300);
      });
    });
  }

  captureNextPage();
}
