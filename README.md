# Doodle Detector

A website that predicts your drawings!  
Inspired by Google's [Quick,Draw!](https://quickdraw.withgoogle.com/), and Sebastian Lague's [Neural Network video](https://www.youtube.com/watch?v=hfMk-kjRv4c&t)

There are two underlying neural networks.  These were created with TensorFlow and Keras (Python).  
The notebook for the MNIST NN can be found in the CNN - Augmented directory.  
The other notebook was not uploaded because it required a large local datasource, but is very similar.


One model was trained on the MNIST dataset, and can predict digits (0-9).  
The other model was trained on Google's Quick,Draw! dataset, and can predict the following shapes:  
- circle
- star
- triangle
- umbrella
- basketball
- fish
- house
- cat


Simply visit [the website](https://doodle-detector.vercel.app/), choose which model you want to use, and begin drawing!
