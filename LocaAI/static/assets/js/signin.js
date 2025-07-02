// LOGIN TABS
$(function() {
  tab = $('.tabs h3 a');
  tab.on('click', function(event) {
    event.preventDefault();
    tab.removeClass('active');
    $(this).addClass('active');
    tab_content = $(this).attr('href');
    $('div[id$="tab-content"]').removeClass('active');
    $(tab_content).addClass('active');
  });
});

// SLIDESHOW
$(function() {
  $('#slideshow > div:gt(0)').hide();
  setInterval(function() {
    $('#slideshow > div:first')
    .fadeOut(1000)
    .next()
    .fadeIn(1000)
    .end()
    .appendTo('#slideshow');
  }, 3850);
});

// CUSTOM JQUERY FUNCTION FOR SWAPPING CLASSES
(function($) {
  'use strict';
  $.fn.swapClass = function(remove, add) {
    this.removeClass(remove).addClass(add);
    return this;
  };
}(jQuery));

// SHOW/HIDE PANEL ROUTINE (needs better methods)
// I'll optimize when time permits.
$(function() {
  $('.agree, .forgot, #toggle-terms, .log-in, .sign-up').on('click', function(event) {
    // preventDefault는 오직 a 태그에만
    if ($(this).is('a')) {
      event.preventDefault();
    }

    var user = $('.user'),
        terms = $('.terms'),
        form = $('.form-wrap'),
        recovery = $('.recovery'),
        close = $('#toggle-terms'),
        arrow = $('.tabs-content .fa');

    if (
      $(this).hasClass('agree') ||
      $(this).hasClass('log-in') ||
      ($(this).is('#toggle-terms') && terms.hasClass('open'))
    ) {
      if (terms.hasClass('open')) {
        form.swapClass('open', 'closed');
        terms.swapClass('open', 'closed');
        close.swapClass('open', 'closed');
      } else {
        if ($(this).hasClass('log-in')) {
          return;
        }
        form.swapClass('closed', 'open');
        terms.swapClass('closed', 'open').scrollTop(0);
        close.swapClass('closed', 'open');
        user.addClass('overflow-hidden');
      }
    } else if (
      $(this).hasClass('forgot') ||
      $(this).hasClass('sign-up') ||
      $(this).is('#toggle-terms')
    ) {
      if (recovery.hasClass('open')) {
        form.swapClass('open', 'closed');
        recovery.swapClass('open', 'closed');
        close.swapClass('open', 'closed');
      } else {
        if ($(this).hasClass('sign-up')) {
          return;
        }
        form.swapClass('closed', 'open');
        recovery.swapClass('closed', 'open');
        close.swapClass('closed', 'open');
        user.addClass('overflow-hidden');
      }
    }
  });
});

// 회원가입 AJAX 처리
$('.signup-form').on('submit', function(event) {
  event.preventDefault();

  const form = $(this);
  const data = form.serialize();

  $.ajax({
    type: 'POST',
    url: form.attr('action'),
    data: data,
    success: function(response) {
      if (response.success) {
        window.location.href = response.redirect_url;  // ✅ 응답에 담긴 redirect URL로 이동
      } else {
        alert('❌ ' + response.error);
      }
    },
    error: function(xhr) {
      alert('서버 에러가 발생했습니다. 다시 시도해주세요.');
    }
  });
});

// 로그인 AJAX 처리
$('.login-form').on('submit', function(event) {
  event.preventDefault();

  const form = $(this);
  const data = form.serialize();

  $.ajax({
    type: 'POST',
    url: form.attr('action'),
    data: data,
    success: function(response) {
      if (response.status === 'success') {
        const nextUrl = form.find('input[name="next"]').val() || '/';
        window.location.href = nextUrl;
      } else {
        alert('❌ ' + response.message);
      }
    },
    error: function() {
      alert('⚠️ 로그인 중 오류가 발생했습니다.');
    }
  });
});