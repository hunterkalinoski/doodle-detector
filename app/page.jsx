"use client";

import { useState, useRef, useEffect } from "react";
import CanvasDraw from "react-canvas-draw";
import * as tf from "@tensorflow/tfjs";

const PIXELS_PER_GRID_CELL = 25;
const NUM_GRID_CELLS = 28;
const FULL_GRID_WIDTH = PIXELS_PER_GRID_CELL * NUM_GRID_CELLS;

export default function Page() {
  const canvasRef = useRef(null); //ref to canvas that you draw on
  const newSmallRef = useRef(null); // ref to canvas that displays tiny version of model input
  const newLargeRef = useRef(null); // ref to canvas that displays large version of model input
  const [model, setModel] = useState(null); //returns the tf model
  const [predictionValues, setPredictionValues] = useState([]);

  // do this on page startup
  useEffect(() => {
    // scale the large canvas up (it is initally only 28x28 in a 700x700 container)
    // this is necessary to achieve pixelated look
    const largeCtx = newLargeRef.current.getContext("2d");
    newLargeRef.current.width = FULL_GRID_WIDTH;
    newLargeRef.current.height = FULL_GRID_WIDTH;
    largeCtx.scale(PIXELS_PER_GRID_CELL, PIXELS_PER_GRID_CELL);
    largeCtx.imageSmoothingEnabled = false;

    tf.loadLayersModel("tfjsmodel/model.json").then((value) => setModel(value));
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current.canvas["drawing"];
    const ctx = canvasRef.current.ctx["drawing"];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    saveImage();
  };

  const saveImage = async () => {
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
    console.log(smallImage); //smallImage contains 28x28 pixels of 0-255 value (good for ML model)
    console.log(pixels);

    let newImgPixels = [];
    // converting array of single values (grayscale) to array containing rgba data
    for (let i = 0; i < smallImage.length; i++) {
      newImgPixels[i * 4] = smallImage[i];
      newImgPixels[i * 4 + 1] = smallImage[i];
      newImgPixels[i * 4 + 2] = smallImage[i];
      newImgPixels[i * 4 + 3] = 255;
    }
    console.log(newImgPixels);

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

    // format the model's required input (1x28x28x1)
    let input = [];
    let count = 0;
    for (let i = 0; i < 28; i++) {
      input[i] = [];
      for (let j = 0; j < 28; j++) {
        input[i][j] = smallImage[count];
        count++;
      }
    }
    let inputTensor = tf.tensor2d(input);
    // console.log(inputTensor);
    let reshapedInputTensor = inputTensor.expandDims(0).expandDims(3);
    // console.log(reshapedInputTensor);

    const prediction = await model.predict(reshapedInputTensor);
    // console.log(prediction.print());
    let predictionValues = prediction.dataSync();
    // console.log(predictionValues);

    let finalPredictionValues = [];
    for (let i = 0; i < predictionValues.length; i++) {
      finalPredictionValues[i] = Math.round(predictionValues[i] * 1000000000000) / 10000000000;
    }
    setPredictionValues(finalPredictionValues);
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
        <p>Predictions:</p>
        <div className="prediction-values">
          <p>0: {predictionValues[0]?.toFixed(5) ?? 0}%</p>
          <p>1: {predictionValues[1]?.toFixed(5) ?? 0}%</p>
          <p>2: {predictionValues[2]?.toFixed(5) ?? 0}%</p>
          <p>3: {predictionValues[3]?.toFixed(5) ?? 0}%</p>
          <p>4: {predictionValues[4]?.toFixed(5) ?? 0}%</p>
          <p>5: {predictionValues[5]?.toFixed(5) ?? 0}%</p>
          <p>6: {predictionValues[6]?.toFixed(5) ?? 0}%</p>
          <p>7: {predictionValues[7]?.toFixed(5) ?? 0}%</p>
          <p>8: {predictionValues[8]?.toFixed(5) ?? 0}%</p>
          <p>9: {predictionValues[9]?.toFixed(5) ?? 0}%</p>
        </div>
        <div style={{ height: "28px" }}></div>{" "}
        {/* makes spacing all nice (other sections have a third thing of 28px height*/}
      </div>
    </div>
  );
}
