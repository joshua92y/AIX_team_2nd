document.addEventListener('DOMContentLoaded', function () {
  const accordionButtons = document.querySelectorAll('.accordion-button');

  accordionButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetId = button.getAttribute('data-bs-target');
      const targetElement = document.querySelector(targetId);

      if (!targetElement) return;

      const collapseInstance = new bootstrap.Collapse(targetElement, {
        toggle: false
      });
      collapseInstance.show();

      // 아코디언 열린 후 스크롤 이동 (더 위로 보정)
      targetElement.addEventListener('shown.bs.collapse', function scrollToAdjusted() {
        const extraOffset = 150; // 👈 여기 숫자 늘릴수록 더 위로
        const y = targetElement.offsetTop - extraOffset;

        window.scrollTo({
          top: y < 0 ? 0 : y,
          behavior: 'auto'
        });

        targetElement.removeEventListener('shown.bs.collapse', scrollToAdjusted);
      });
    });
  });
});
