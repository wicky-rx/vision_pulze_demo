import { useEffect, RefObject } from "react";

export function useSmoothScroll(ref: RefObject<HTMLDivElement | null>, deps: any[] = []) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let targetScrollTop = container.scrollTop;
    let currentScrollTop = container.scrollTop;
    let isAnimating = false;
    const damping = 0.08;

    const updateScroll = () => {
      const diff = targetScrollTop - currentScrollTop;
      
      if (Math.abs(diff) < 0.1) {
        container.scrollTop = targetScrollTop;
        currentScrollTop = targetScrollTop;
        isAnimating = false;
        return;
      }

      currentScrollTop += diff * damping;
      container.scrollTop = currentScrollTop;

      if (isAnimating) {
        requestAnimationFrame(updateScroll);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (container.scrollHeight <= container.clientHeight) {
        return;
      }

      let activeEl = e.target as HTMLElement;
      while (activeEl && activeEl !== container) {
        const style = window.getComputedStyle(activeEl);
        if (
          activeEl.scrollHeight > activeEl.clientHeight &&
          (style.overflowY === "auto" || style.overflowY === "scroll" || activeEl.tagName === "TEXTAREA")
        ) {
          return;
        }
        activeEl = activeEl.parentElement as HTMLElement;
      }

      e.preventDefault();

      if (!isAnimating) {
        currentScrollTop = container.scrollTop;
        targetScrollTop = container.scrollTop;
        isAnimating = true;
        requestAnimationFrame(updateScroll);
      }

      const multiplier = 1.3;
      targetScrollTop = Math.max(
        0,
        Math.min(
          container.scrollHeight - container.clientHeight,
          targetScrollTop + e.deltaY * multiplier
        )
      );
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      isAnimating = false;
    };
  }, [ref, ...deps]);
}
