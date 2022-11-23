// import tensorflowjs
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js");

addEventListener("message", async ({ data }) => {
  // load the tfjs model
  const model = await tf.loadLayersModel("/tfjsmodel/model.json");

  // cast pixels to a tensor
  const tensor = tf.tensor4d(data, [1, 28, 28, 1]);

  // predict
  const predictions = model.predict(tensor).dataSync();

  // get largest index (the number that was predicted) and set state
  const max = Math.max(...predictions);
  const finalPrediction = predictions.indexOf(max);

  // send message with prediction
  postMessage(finalPrediction);
});
