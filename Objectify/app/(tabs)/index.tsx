import React, { useState } from 'react';
import { View, Button, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function HomeScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('');

  // Request camera and gallery permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      alert('Sorry, we need camera and gallery permissions to make this work!');
    }
  };

  // Open camera to take a photo
  const takePhoto = async () => {
    setLoading(true);
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true, // Get image as base64
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeImage(result.assets[0].base64);
    } else {
      setLoading(false);
    }
  };

  // Open gallery to pick an image
  const pickImage = async () => {
    setLoading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true, // Get image as base64
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeImage(result.assets[0].base64);
    } else {
      setLoading(false);
    }
  };

  // Send image to Gemini API for analysis
  const analyzeImage = async (base64Image) => {
    try {
      const apiKey = 'AIzaSyAriFoIsdDSvBAS6Zsh_B8zmdgAePdZUlU'; // Replace with your API key
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await axios.post(url, {
        contents: [
          {
            parts: [
              {
                text: "Analyze the given image and identify the closest object within the scene. \
                       For each characteristic answer in one word on new line to later use as features. Do not include feature names in answer, just values you produce. \
                       Name object category; \
                       Potential material(s); \
                       cultural region (Latin-America, Asia, Anglo-America, Europe, Africa or Oceania); \
                       religious/belief significance if has any, if none then leave as None; \
                       main colour; \
                       three main moods it gives (each on new line); \
                       Historical or symbolic context (e.g., ancient, modern, ceremonial, etc.); \
                       Associated sound or auditory quality (e.g., chime, drum, silence, etc.) \
                       Based on the characterstics that you produce, you need to map them to these Spotify songs feature values: \
                       Danceability between 0.073 and 0.985; \
                       Energy between 0.005 and 0.996; \
                       Loudness between -60 and 0 (Lower value, quieter is is); \
                       Speechiness between 0.022 and 0.966; \
                       Acousticness between 0 and 0.994; \
                       Valence between 0.26 and 0.982",
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      setResponseText(response.data.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setResponseText('Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Pick from Gallery" onPress={pickImage} />
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {image && <Image source={{ uri: image }} style={styles.image} />}

      {responseText && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseText}>{responseText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  responseContainer: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '80%',
  },
  responseText: {
    fontSize: 16,
    color: '#333',
  },
});