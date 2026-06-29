/**
 * utils/reveal.ts — Scroll-triggered reveal observer
 * Import and call initReveal() after route changes or async data loads.
 */

export function initReveal() {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}
