"use client";

import { useState, useRef, useEffect } from "react";
import { Dna } from "react-loader-spinner";
import CanvasDraw from "react-canvas-draw";

const PIXELS_PER_GRID_CELL = 25;
const NUM_GRID_CELLS = 28;
const FULL_GRID_WIDTH = PIXELS_PER_GRID_CELL * NUM_GRID_CELLS;

export default function Page() {
  const canvasRef = useRef(null); //ref to canvas that you draw on
  const newSmallRef = useRef(null); // ref to canvas that displays tiny version of model input
  const newLargeRef = useRef(null); // ref to canvas that displays large version of model input
  const [prediction, setPrediction] = useState(-1); // -1 means canvas is empty, -2 means loading, anything else is real value
  const [worker, setWorker] = useState(null);

  // do this on page startup
  useEffect(() => {
    // scale the large canvas up (it is initally only 28x28 in a 700x700 container)
    // this is necessary to achieve pixelated look
    const largeCtx = newLargeRef.current.getContext("2d");
    newLargeRef.current.width = FULL_GRID_WIDTH;
    newLargeRef.current.height = FULL_GRID_WIDTH;
    largeCtx.scale(PIXELS_PER_GRID_CELL, PIXELS_PER_GRID_CELL);
    largeCtx.imageSmoothingEnabled = false;

    initWorker();
  }, []);

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

  // clear the drawing canvas and also clear prediction
  const clearCanvas = async () => {
    const canvas = canvasRef.current.canvas["drawing"];
    const ctx = canvasRef.current.ctx["drawing"];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await saveImage(false); // clears other canvases
  };

  // predict based on current canvas
  const predictDoodle = async () => {
    setPrediction(-2); // let program know we are loading/waiting for the result
    // get all pixels from small image (28x28)
    const imageData = newSmallRef.current.getContext("2d").getImageData(0, 0, 28, 28).data;

    // extract r values from [r,g,b,a] array (convert to grayscale)
    let pixels = [];
    for (let i = 0; i < 784; i++) {
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
    // const base64 = canvasRef.current.canvasContainer.childNodes[1].toDataURL();
    // const bytes = base64.split(",")[1];
    // const decoded = atob(bytes);
    const context = canvasRef.current.ctx;
    const imageData = context["drawing"].getImageData(0, 0, FULL_GRID_WIDTH, FULL_GRID_WIDTH);

    let pixels = [];
    let i = 0;
    for (let y = 0; y < FULL_GRID_WIDTH; y++) {
      for (let x = 0; x < FULL_GRID_WIDTH; x++) {
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

  return (
    <div className="app">
      <div className="section drawing-section">
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
        <button className="clear-canvas-button" onClick={clearCanvas}>
          Clear Canvas
        </button>
      </div>
      <div className="section model-section">
        <p>Model Input:</p>
        <div className="large-model-canvas-container">
          <canvas ref={newLargeRef} width={28} height={28}></canvas>
        </div>
        <canvas ref={newSmallRef} width={28} height={28}></canvas>
      </div>
      <div className="section results-section">
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
        <div style={{ height: "28px" }}></div>{" "}
        {/* makes spacing all nice (other sections have a third thing of 28px height */}
      </div>
    </div>
  );
}