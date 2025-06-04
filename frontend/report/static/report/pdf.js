function waitForRenderComplete(element, callback) {
  const observer = new MutationObserver((mutations, obs) => {
    if (element.innerText.trim().length > 0) {
      setTimeout(() => {
        obs.disconnect();
        callback();
      }, 300);
    }
  });
  observer.observe(element, { childList: true, subtree: true, characterData: true });
}

function prepareAndSavePDF() {
  const report = document.getElementById('report-section');
  const saveBtn = document.getElementById('save-pdf-button');

  if (!report || report.innerText.trim().length === 0) {
    alert("❌ 보고서가 비어 있습니다. 먼저 분석을 진행해주세요.");
    return;
  }

  waitForRenderComplete(report, () => {
    const cloned = report.cloneNode(true);
    cloned.style.width = '794px';
    cloned.style.minHeight = '1123px';
    cloned.style.padding = '20px';
    cloned.style.backgroundColor = '#ffffff';
    cloned.style.fontFamily = `'Noto Sans KR', sans-serif`;

    const opt = {
      margin: 0.5,
      filename: `상권_분석_보고서_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Save button을 잠시 비활성화
    if (saveBtn) saveBtn.disabled = true;

    html2pdf().set(opt).from(cloned).save().then(() => {
      if (saveBtn) saveBtn.disabled = false; // 저장 후 다시 버튼 활성화
      console.log("📂 PDF 저장 완료!");
    }).catch((err) => {
      console.error("PDF 저장 중 오류 발생:", err);
      if (saveBtn) saveBtn.disabled = false; // 오류 발생 시 버튼 복원
    });
  });
}

// ✅ 이벤트 바인딩: 동적으로 생성된 저장 버튼에도 작동하게 설정
$(document).on('click', '#save-pdf-button', function () {
  console.log("💾 저장 버튼 눌림");
  prepareAndSavePDF();
});