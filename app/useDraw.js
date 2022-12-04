import { useEffect, useRef, useState } from "react";

export const useDraw = (onDraw) => {
  const [mouseDown, setMouseDown] = useState(false);

  // flip from true -> false when any drawing is made (on mousemove)
  // listen to this with useeffect
  // essentially value is useless, but changes when canvas changes
  const [canvasChanged, setCanvasChanged] = useState(false);
  const [canvasCleared, setCanvasCleared] = useState(false);

  const canvasRef = useRef(null);
  const prevPoint = useRef(null);

  const onMouseDown = () => setMouseDown(true);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasChanged(!canvasChanged);
    setCanvasCleared(true);
  };

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      if (!mouseDown) return;
      let currentPoint = computePointInCanvas(e.clientX, e.clientY);
      if (isNaN(currentPoint.x)) {
        currentPoint = computePointInCanvas(e.touches[0].clientX, e.touches[0].clientY);
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !currentPoint) return;

      onDraw({ ctx, currentPoint, prevPoint: prevPoint.current });
      prevPoint.current = currentPoint;
      setCanvasChanged(!canvasChanged);
      setCanvasCleared(false);
    };

    const computePointInCanvas = (eX, eY) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = eX - rect.left;
      const y = eY - rect.top;

      return { x, y };
    };

    const mouseUpHandler = () => {
      setMouseDown(false);
      prevPoint.current = null;
    };

    // Add event listeners
    canvasRef.current?.addEventListener("mousemove", handler);
    canvasRef.current?.addEventListener("touchmove", handler);
    window.addEventListener("mouseup", mouseUpHandler);
    window.addEventListener("touchend", mouseUpHandler);

    // Remove event listeners
    return () => {
      canvasRef.current?.removeEventListener("mousemove", handler);
      canvasRef.current?.removeEventListener("touchmove", handler);
      window.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("touchend", mouseUpHandler);
    };
  }, [onDraw]);

  return { canvasRef, onMouseDown, clear, canvasChanged, canvasCleared };
};
