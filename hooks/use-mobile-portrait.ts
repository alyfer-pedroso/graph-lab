import * as React from "react";

const MOBILE_PORTRAIT_MAX_WIDTH = 640;

export function useIsMobilePortrait() {
  const [isMobilePortrait, setIsMobilePortrait] = React.useState<boolean>(false);

  React.useEffect(() => {
    const widthMql = window.matchMedia(`(max-width: ${MOBILE_PORTRAIT_MAX_WIDTH - 1}px)`);
    const orientationMql = window.matchMedia("(orientation: portrait)");

    const update = () => {
      setIsMobilePortrait(widthMql.matches && orientationMql.matches);
    };

    update();
    widthMql.addEventListener("change", update);
    orientationMql.addEventListener("change", update);
    return () => {
      widthMql.removeEventListener("change", update);
      orientationMql.removeEventListener("change", update);
    };
  }, []);

  return isMobilePortrait;
}
