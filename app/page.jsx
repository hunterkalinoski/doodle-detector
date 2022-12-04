"use client";

import { Dna } from "react-loader-spinner";
import { useState, useRef, useEffect } from "react";
import { useDraw } from "./useDraw";

const NUM_GRID_CELLS = 28;
const PIXELS_PER_GRID_CELL = 25;
const CANVAS_SIZE = NUM_GRID_CELLS * PIXELS_PER_GRID_CELL;

const page = ({}) => {
  const { canvasRef, onMouseDown, clear, canvasChanged, canvasCleared } = useDraw(drawLine);
  const newSmallRef = useRef(null); // ref to canvas that displays tiny version of model input
  const newLargeRef = useRef(null); // ref to canvas that displays large version of model input
  const [prediction, setPrediction] = useState(-1); // -1 means canvas is empty, -2 means loading, anything else is real value
  const [worker, setWorker] = useState(null);

  // do this on page startup
  useEffect(() => {
    // scale the large canvas up (it is initally only 28x28 in a 700x700 container)
    // this is necessary to achieve pixelated look
    const largeCtx = newLargeRef.current.getContext("2d");
    newLargeRef.current.width = CANVAS_SIZE;
    newLargeRef.current.height = CANVAS_SIZE;
    largeCtx.scale(PIXELS_PER_GRID_CELL, PIXELS_PER_GRID_CELL); // want it to look like 28 x 28 pixels
    largeCtx.imageSmoothingEnabled = false;

    initWorker();
  }, []);

  // do this when canvas changes (when some line is put on the canvas)
  useEffect(() => {
    saveImage(!canvasCleared);
  }, [canvasChanged, canvasCleared]);

  // web worker to handle tensorflow stuff
  // prevents ~1s initial load to import tensorflow
  // prevents ~1s lag on first model.predict that happens
  // when this thread receives message from worker, set state
  const initWorker = () => {
    const worker = new Worker("workers/model-worker.js");
    worker.onmessage = ({ data }) => {
      setPrediction(data);
    };
    setWorker(worker);
  };

  // predict based on current canvas
  const predictDoodle = async () => {
    if (worker == null) {
      return;
    }
    setPrediction(-2); // let program know we are loading/waiting for the result
    // get all pixels from small image (28x28)
    const imageData = newSmallRef.current
      .getContext("2d", { willReadFrequently: true })
      .getImageData(0, 0, NUM_GRID_CELLS, NUM_GRID_CELLS).data;

    // extract r values from [r,g,b,a] array (convert to grayscale)
    let pixels = [];
    for (let i = 0; i < Math.pow(NUM_GRID_CELLS, 2); i++) {
      // stored as (r,g,b,a), where a is always 255 and r=g=b=the pixel value in grayscale
      // so grab every 4th element in imageData (index 0, index 4, ...)
      // this is the 'r' value [0-255]
      pixels[i] = imageData[i * 4];
    }

    // use a web worker to predict
    worker.postMessage(pixels);
  };

  // if isContentful, save image and run through model
  // otherwise, clear was called so no need to predict
  const saveImage = async (isContentful) => {
    const context = canvasRef.current.getContext("2d", { willReadFrequently: true });
    // const imageData = context["drawing"].getImageData(0, 0, FULL_GRID_WIDTH, FULL_GRID_WIDTH);
    const imageData = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    let pixels = [];
    let i = 0;
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        let index = (y * imageData.width + x) * 4;
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
    let smallImage = [];

    // loop over each grid cell
    for (let y = 0; y < NUM_GRID_CELLS; y++) {
      for (let x = 0; x < NUM_GRID_CELLS; x++) {
        let count = 0;

        // each grid cell is 25x25 pixels
        // loop over each pixel
        for (let m = 0; m < PIXELS_PER_GRID_CELL; m++) {
          for (let n = 0; n < PIXELS_PER_GRID_CELL; n++) {
            if (
              pixels[
                n +
                  m * CANVAS_SIZE +
                  x * PIXELS_PER_GRID_CELL +
                  y * CANVAS_SIZE * PIXELS_PER_GRID_CELL
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
    // console.log(smallImage); //smallImage contains 28x28 pixels of 0-255 value (good for ML model)
    // console.log(pixels);

    let newImgPixels = [];
    // converting array of single values (grayscale) to array containing rgba data
    for (let i = 0; i < smallImage.length; i++) {
      newImgPixels[i * 4] = smallImage[i];
      newImgPixels[i * 4 + 1] = smallImage[i];
      newImgPixels[i * 4 + 2] = smallImage[i];
      newImgPixels[i * 4 + 3] = 255;
    }
    // console.log(newImgPixels);

    const newSmallCtx = newSmallRef.current.getContext("2d");
    newSmallCtx.clearRect(0, 0, newSmallRef.current.width, newSmallRef.current.height);
    let newSmallimgData = newSmallCtx.createImageData(NUM_GRID_CELLS, NUM_GRID_CELLS);
    for (let i = 0; i < newSmallimgData.data.length; i++) {
      newSmallimgData.data[i] = newImgPixels[i];
    }
    newSmallCtx.putImageData(newSmallimgData, 0, 0);
    // console.log(newSmallimgData.data);

    const largeCtx = newLargeRef.current.getContext("2d");
    largeCtx.clearRect(0, 0, newLargeRef.current.width, newLargeRef.current.height);
    largeCtx.drawImage(newSmallRef.current, 0, 0);

    // if canvas is empty, dont predict
    if (isContentful) {
      await predictDoodle();
    } else {
      setPrediction(-1);
    }
  };

  function drawLine({ prevPoint, currentPoint, ctx }) {
    const { x: currX, y: currY } = currentPoint;
    const lineColor = "red";
    const lineWidth = 75;

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
        <p className="title-label">Draw Here</p>
        <div className="canvases">
          <canvas
            ref={newLargeRef}
            width={NUM_GRID_CELLS}
            height={NUM_GRID_CELLS}
            className="canvas-pixels"
          />
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="canvas-main"
          />
        </div>
        <button type="button" className="clear-button" onClick={clear}>
          Clear canvas
        </button>
      </div>
      <canvas
        ref={newSmallRef}
        width={NUM_GRID_CELLS}
        height={NUM_GRID_CELLS}
        className="canvas-small"
      />
      <div className="results-section">
        <p>Prediction:</p>
        <div className="prediction-values">
          {prediction == -2 ? (
            <Dna
              visible={true}
              height="80"
              width="80"
              ariaLabel="dna-loading"
              wrapperStyle={{}}
              wrapperClass="dna-wrapper"
            />
          ) : prediction == -1 ? (
            <p>Draw Something!</p>
          ) : (
            <p>You drew a {prediction}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default page;
