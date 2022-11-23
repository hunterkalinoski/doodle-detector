// import tensorflowjs
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js");

addEventListener("message", async ({ data }) => {
  // load the tfjs model
  console.log("message received...");
  const model = await tf.loadLayersModel("http://localhost:3000/tfjsmodel/model.json");

  // cast pixels to a tensor
  const tensor = tf.tensor4d(data, [1, 28, 28, 1]);

  // predict
  const prediction = model.predict(tensor);

  // send message with prediction
  postMessage(prediction.dataSync());
  console.log("message handled...");
});
