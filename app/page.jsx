"use client";

import { useState, useRef, useEffect } from "react";
import CanvasDraw from "react-canvas-draw";

const PIXELS_PER_GRID_CELL = 25;
const NUM_GRID_CELLS = 28;
const FULL_GRID_WIDTH = PIXELS_PER_GRID_CELL * NUM_GRID_CELLS;

export default function Page() {
  const canvasRef = useRef(null);
  const newSmallRef = useRef(null);
  const newLargeRef = useRef(null);
  const [newLargeCount, setNewLargeCount] = useState(0); // only want to scale up once

  useEffect(() => {
    // canvasRef.current.canvas.willReadFrequently = true; //doesn't work
    const largeCtx = newLargeRef.current.getContext("2d");
    if (newLargeCount == 0) {
      newLargeRef.current.width = FULL_GRID_WIDTH;
      newLargeRef.current.height = FULL_GRID_WIDTH;
      largeCtx.scale(PIXELS_PER_GRID_CELL, PIXELS_PER_GRID_CELL);
      largeCtx.imageSmoothingEnabled = false;
      setNewLargeCount(newLargeCount + 1);

      newSmallRef.current.width = NUM_GRID_CELLS;
      newSmallRef.current.height = NUM_GRID_CELLS;
    }
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current.canvas["drawing"];
    const ctx = canvasRef.current.ctx["drawing"];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    saveImage();
  };

  const saveImage = () => {
    // const base64 = canvasRef.current.canvasContainer.childNodes[1].toDataURL();
    // const bytes = base64.split(",")[1];
    // const decoded = atob(bytes);
    const context = canvasRef.current.ctx;
    const imageData = context["drawing"].getImageData(0, 0, FULL_GRID_WIDTH, FULL_GRID_WIDTH);

    var pixels = [];
    var i = 0;
    for (var y = 0; y < FULL_GRID_WIDTH; y++) {
      for (var x = 0; x < FULL_GRID_WIDTH; x++) {
        var index = (y * imageData.width + x) * 4;
        // pixels[i] = {
        //   r: imageData.data[index],
        //   g: imageData.data[index + 1],
        //   b: imageData.data[index + 2],
        //   a: imageData.data[index + 3],
        // };
        if (imageData.data[index + 3] > 0) {
          pixels[i] = 1;
        } else {
          pixels[i] = 0;
        }

        i++;
      }
    }
    var smallImage = [];

    // loop over each grid cell
    for (var y = 0; y < NUM_GRID_CELLS; y++) {
      for (var x = 0; x < NUM_GRID_CELLS; x++) {
        var count = 0;

        // each grid cell is 25x25 pixels
        // loop over each pixel
        for (var m = 0; m < PIXELS_PER_GRID_CELL; m++) {
          for (var n = 0; n < PIXELS_PER_GRID_CELL; n++) {
            if (
              pixels[
                n +
                  m * FULL_GRID_WIDTH +
                  x * PIXELS_PER_GRID_CELL +
                  y * FULL_GRID_WIDTH * PIXELS_PER_GRID_CELL
              ] == 1
            ) {
              count++;
            }
          }
        }
        const val = Math.floor((count / Math.pow(PIXELS_PER_GRID_CELL, 2)) * 255); // convert range to 0-255 (25pixels per grid cell is 0-625 range)
        smallImage[y * NUM_GRID_CELLS + x] = val;
      }
    }
    console.log(smallImage); //smallImage contains 28x28 pixels of 0-255 value (good for ML model)
    console.log(pixels);

    var newImgPixels = [];
    // converting array of single values (grayscale) to array containing rgba data
    for (var i = 0; i < smallImage.length; i++) {
      newImgPixels[i * 4] = smallImage[i];
      newImgPixels[i * 4 + 1] = smallImage[i];
      newImgPixels[i * 4 + 2] = smallImage[i];
      newImgPixels[i * 4 + 3] = 255;
    }
    console.log(newImgPixels);

    const newSmallCtx = newSmallRef.current.getContext("2d");
    newSmallCtx.clearRect(0, 0, newSmallRef.current.width, newSmallRef.current.height);
    var newSmallimgData = newSmallCtx.createImageData(NUM_GRID_CELLS, NUM_GRID_CELLS);
    for (var i = 0; i < newSmallimgData.data.length; i++) {
      newSmallimgData.data[i] = newImgPixels[i];
    }
    newSmallCtx.putImageData(newSmallimgData, 0, 0);

    const largeCtx = newLargeRef.current.getContext("2d");
    largeCtx.clearRect(0, 0, newLargeRef.current.width, newLargeRef.current.height);
    largeCtx.drawImage(newSmallRef.current, 0, 0);
  };

  return (
    <div className="App">
      <div className="canvas-container">
        <p>Draw Here</p>
        <CanvasDraw
          onChange={saveImage}
          ref={canvasRef}
          className="canvas"
          lazyRadius={0}
          brushRadius={30}
          brushColor={"#f00"}
          catenaryColor={"#000"}
          gridColor={"rgba(0,0,0,255  )"}
          canvasWidth={FULL_GRID_WIDTH}
          canvasHeight={FULL_GRID_WIDTH}
          backgroundColor={"#fff"}
          gridSizeX={PIXELS_PER_GRID_CELL}
          gridSizeY={PIXELS_PER_GRID_CELL}
        />
        <button onClick={clearCanvas}>Clear Canvas</button>
      </div>
      <div className="canvas-container">
        <p>Model input:</p>
        <canvas ref={newLargeRef}></canvas>
        <canvas ref={newSmallRef}></canvas>
      </div>
      <div className="panel">
        <p>Predictions:</p>
        <div className="results-container">
          <div className="results">
            <p>8: 80%</p>
            <p>1: 15%</p>
            <p>9: 4%</p>
            <p>0: 1%</p>
            <p>2: 0%</p>
            <p>3: 0%</p>
            <p>4: 0%</p>
            <p>5: 0%</p>
            <p>6: 0%</p>
            <p>7: 0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
