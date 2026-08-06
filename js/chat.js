/* ============================================================================
   Plays the conversation inside .chat, once, when it scrolls into view.
   ----------------------------------------------------------------------------
   The script only *reveals* messages — every line already exists in the HTML.
   That ordering matters: with JavaScript off, or if this file never arrives,
   the visitor sees the whole conversation as static text instead of an empty
   box where a demo should be.
   ========================================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.chat').forEach(function (chat) {
    var log    = chat.querySelector('.chat__log');
    var typing = chat.querySelector('.typing');
    var replay = chat.querySelector('.chat__replay');
    if (!log) return;

    var msgs = Array.prototype.slice.call(log.querySelectorAll('.msg'));
    var timers = [];

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function showAll() {
      clearTimers();
      if (typing) typing.hidden = true;
      msgs.forEach(function (m) {
        m.classList.add('is-in');
        var k = m.querySelector('.msg__key[data-tapped]');
        if (k) k.classList.add('is-tapped');
      });
    }

    /* Reduced motion gets the finished conversation and nothing else. */
    if (reduce) { showAll(); return; }

    function play() {
      clearTimers();
      msgs.forEach(function (m) {
        m.classList.remove('is-in');
        var k = m.querySelector('.msg__key');
        if (k) k.classList.remove('is-tapped');
      });
      if (typing) typing.hidden = true;

      var t = 400;
      msgs.forEach(function (m, i) {
        var fromBot = m.classList.contains('msg--bot');

        /* The bot "thinks" before answering; the customer does not. Skipping
           this reads as a canned script rather than a reply. */
        if (fromBot && typing) {
          timers.push(setTimeout(function () {
            typing.hidden = false;
            log.appendChild(typing);          /* keep the dots at the bottom */
          }, t));
          t += 700;
        }

        timers.push(setTimeout(function () {
          if (typing) typing.hidden = true;
          m.classList.add('is-in');
          var k = m.querySelector('.msg__key[data-tapped]');
          if (k) setTimeout(function () { k.classList.add('is-tapped'); }, 450);
        }, t));

        /* Long multi-line answers need longer on screen before the next line. */
        t += fromBot ? 1150 : 800;
        if (i === msgs.length - 1) t += 200;
      });
    }

    if (replay) replay.addEventListener('click', play);

    if (!('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        play();
      });
    }, { threshold: 0.35 });

    io.observe(chat);
  });
})();
