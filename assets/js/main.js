(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------
     Mobile menu
  ------------------------------------------------------------------ */
  var menuBtn = $(".site-header__menu");
  var nav = $("#site-nav");

  if (menuBtn && nav) {
    var setOpen = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("site-nav--open", open);
    };

    menuBtn.addEventListener("click", function () {
      setOpen(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 880) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     Toast
  ------------------------------------------------------------------ */
  var toastRegion = $(".toast-region");
  var toastTimer = null;

  var toast = function (message) {
    if (!toastRegion) return;
    toastRegion.innerHTML = "";
    var el = document.createElement("p");
    el.className = "toast";
    el.textContent = message;
    toastRegion.appendChild(el);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.remove();
    }, 2400);
  };

  /* ------------------------------------------------------------------
     Copy to clipboard buttons
  ------------------------------------------------------------------ */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy") || "";

      var fallbackCopy = function () {
        var ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        ta.remove();
        toast(ok ? "Copied: " + value : "Copy failed");
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () {
          toast("Copied: " + value);
        }, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  });

  /* ------------------------------------------------------------------
     Back to top
  ------------------------------------------------------------------ */
  $$("[data-top]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ------------------------------------------------------------------
     Project index scrollspy
  ------------------------------------------------------------------ */
  var indexLinks = $$(".index__row");
  var records = $$(".record");

  if (indexLinks.length && records.length && "IntersectionObserver" in window) {
    var linkById = {};
    indexLinks.forEach(function (link) {
      var id = (link.getAttribute("href") || "").slice(1);
      if (id) linkById[id] = link;
    });

    var visible = new Set();

    var sync = function () {
      indexLinks.forEach(function (link) { link.removeAttribute("aria-current"); });
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        if (visible.has(rec.id) && linkById[rec.id]) {
          linkById[rec.id].setAttribute("aria-current", "true");
          break;
        }
      }
    };

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        sync();
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    records.forEach(function (rec) { observer.observe(rec); });
  }
})();
