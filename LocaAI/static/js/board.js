document.addEventListener('DOMContentLoaded', function() {
    // 폼 유효성 검사
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // 파일 업로드 미리보기
    const thumbnailInput = document.querySelector('input[type="file"][name="thumbnail"]');
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.querySelector('.post-thumbnail img');
                    if (preview) {
                        preview.src = e.target.result;
                    } else {
                        const thumbnailDiv = document.querySelector('.post-thumbnail');
                        if (thumbnailDiv) {
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'img-fluid';
                            thumbnailDiv.appendChild(img);
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 댓글 폼 토글
    const commentToggle = document.querySelector('.comment-toggle');
    if (commentToggle) {
        commentToggle.addEventListener('click', function() {
            const commentForm = document.querySelector('.comment-form');
            if (commentForm) {
                commentForm.classList.toggle('d-none');
            }
        });
    }

    // 삭제 확인
    const deleteButtons = document.querySelectorAll('.delete-confirm');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            if (!confirm('정말로 삭제하시겠습니까?')) {
                event.preventDefault();
            }
        });
    });
    // 파일명 표시 (썸네일)
    const thumbnailFileInput = document.getElementById('thumbnail-input');
    if (thumbnailFileInput) {
        thumbnailFileInput.addEventListener('change', function () {
            const fileName = this.files[0]?.name || '';
            const spans = document.querySelectorAll('#thumbnail-filename span');
            spans.forEach(span => {
                const lang = span.getAttribute('data-lang');
                if (fileName) {
                    span.innerText = fileName;
                } else {
                    if (lang === 'KOR') span.innerText = '선택된 파일 없음';
                    else if (lang === 'ENG') span.innerText = 'No file chosen';
                    else if (lang === 'ESP') span.innerText = 'Ningún archivo seleccionado';
                }
            });
        });
    }

    // 파일명 표시 (첨부파일)
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const fileName = this.files[0]?.name || '';
            const spans = document.querySelectorAll('#file-filename span');
            spans.forEach(span => {
                const lang = span.getAttribute('data-lang');
                if (fileName) {
                    span.innerText = fileName;
                } else {
                    if (lang === 'KOR') span.innerText = '선택된 파일 없음';
                    else if (lang === 'ENG') span.innerText = 'No file chosen';
                    else if (lang === 'ESP') span.innerText = 'Ningún archivo seleccionado';
                }
            });
        });
    }
}); 