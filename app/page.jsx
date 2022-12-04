"use client";

import { Dna } from "react-loader-spinner";
import { useState } from "react";
import { useDraw } from "./useDraw";

const page = ({}) => {
  const { canvasRef, onMouseDown, clear } = useDraw(drawLine);

  function drawLine({ prevPoint, currentPoint, ctx }) {
    const { x: currX, y: currY } = currentPoint;
    const lineColor = "black";
    const lineWidth = 50;

    let startPoint = prevPoint ?? currentPoint;
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.lineCap = "round"; // makes drawing a point a circle instead of a line
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(currX, currY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  return (
    <div className="app">
      <div className="content">
        <button type="button" className="clear-button" onClick={clear}>
          Clear canvas
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        width={750}
        height={750}
        className="canvas-main"
      />
    </div>
  );
};

export default page;
