(() => {
  const originalFitAll = fitAll;

  fitAll = function responsiveFitAll() {
    requestAnimationFrame(() => {
      const rect = els.cardShell.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || width * 1.5;
      const tallViewport = window.innerHeight > window.innerWidth * 1.12;
      const largeCard = width >= 560 || height >= 840;
      const presentationMode = document.fullscreenElement || !state.controlsVisible || document.body.classList.contains("immersive-mobile");
      const portraitPresentation = tallViewport && largeCard && presentationMode && window.innerWidth > 720;

      const titleMax = portraitPresentation
        ? Math.min(40, Math.max(24, width * .057))
        : Math.min(29, Math.max(18, width * .047));
      const titleMin = portraitPresentation
        ? Math.max(15, width * .031)
        : Math.max(12, width * .029);

      if (els.cardTitle.textContent) fitSingle(els.cardTitle, titleMax, titleMin);

      els.cardId.style.fontSize = (portraitPresentation
        ? Math.min(27, Math.max(16, width * .040))
        : Math.min(22, Math.max(14, width * .036))) + "px";

      if (!state.currentCard) return;

      if (state.currentCard.CardType !== "image") {
        const blocks = els.textLayout.querySelectorAll(".text-block");
        const labels = els.textLayout.querySelectorAll(".section-label");

        const maxText = portraitPresentation
          ? Math.min(36, Math.max(20, width * .049))
          : Math.min(27, Math.max(16, width * .040));
        const minText = portraitPresentation
          ? Math.max(14, width * .029)
          : Math.max(12, width * .028);
        const maxLabel = portraitPresentation
          ? Math.min(25, Math.max(15, width * .034))
          : Math.min(20, Math.max(13, width * .030));
        const minLabel = portraitPresentation
          ? Math.max(11, width * .024)
          : Math.max(10, width * .023);

        if (blocks[0] && labels[0]) {
          fitBlock(blocks[0], els.scenarioText, labels[0], maxText, minText, maxLabel, minLabel);
        }
        if (blocks[1] && labels[1]) {
          fitBlock(blocks[1], els.answerText, labels[1], maxText, minText, maxLabel, minLabel);
        }
      } else {
        let size = portraitPresentation
          ? Math.min(30, Math.max(17, width * .044))
          : Math.min(23, Math.max(14, width * .038));
        const min = portraitPresentation
          ? Math.max(12, width * .025)
          : Math.max(10, width * .024);

        els.imagePrompt.style.fontSize = els.imageAnswerText.style.fontSize = size + "px";
        for (let guard = 0; overflow(els.imageLayout) && size > min && guard < 80; guard++) {
          size -= .5;
          els.imagePrompt.style.fontSize = els.imageAnswerText.style.fontSize = size + "px";
        }
      }
    });
  };

  // Re-fit immediately in case this file loads after the first card/layout pass.
  setTimeout(() => fitAll(), 0);
})();