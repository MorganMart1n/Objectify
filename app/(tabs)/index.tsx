import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  FlatList,
  Platform,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import RNFS from "react-native-fs"; // For web platform
import Papa from "papaparse"; // For parsing CSV

export default function HomeScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [songs, setSongs] = useState([]);
  const [spotifyData, setSpotifyData] = useState([]);

  // Load the CSV file on component mount
  useEffect(() => {
    const loadCSV = async () => {
      try {
        let csvData;

        if (Platform.OS === "web") {
          // For web platform, use fetch to load the CSV file
          const response = await fetch("/assets/cleaned2.csv");
          csvData = await response.text();
        } else {
          // For mobile platforms, use expo-file-system
          const csvUri = FileSystem.documentDirectory + "cleaned2.csv";
          await FileSystem.copyAsync({
            from: `${FileSystem.bundleDirectory}assets/cleaned2.csv`,
            to: csvUri,
          });
          csvData = await FileSystem.readAsStringAsync(csvUri);
        }

        // Parse CSV with delimiter ;
        const parsedData = Papa.parse(csvData, {
          header: true,
          delimiter: ",", // Specify the delimiter
        }).data;

        console.log("Parsed CSV Data:", parsedData); // Debug parsed data
        setSpotifyData(parsedData);
      } catch (error) {
        console.error("Error loading CSV:", error);
      }
    };

    loadCSV();
  }, []);

  // Request camera and gallery permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus !== "granted" || galleryStatus !== "granted") {
      alert("Sorry, we need camera and gallery permissions to make this work!");
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
      const apiKey = "AIzaSyAriFoIsdDSvBAS6Zsh_B8zmdgAePdZUlU"; // Replace with your API key
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
                       Valence between 0.26 and 0.982; \
                       Region (Latin-America, Asia, Anglo-America, Europe, Africa or Oceania); \
                       Dont have any whitespace lines and dont include names for song features, only values",
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const responseText = response.data.candidates[0].content.parts[0].text;
      setResponseText(responseText);
      filterSongs(responseText);
    } catch (error) {
      console.error("Error analyzing image:", error);
      setResponseText("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter songs based on Gemini response
  const filterSongs = (responseText) => {
    const lines = responseText.split("\n");
    const danceability = parseFloat(lines[lines.length - 7]) || 0.5; // Adjust indices based on response
    const energy = parseFloat(lines[lines.length - 6]) || 0.5;
    const loudness = parseFloat(lines[lines.length - 5]) || 0.5;
    const speechiness = parseFloat(lines[lines.length - 4]) || 0.5;
    const acousticness = parseFloat(lines[lines.length - 3]) || 0.5;
    const valence = parseFloat(lines[lines.length - 2]) || 0.5;
    const region = lines[lines.length - 1]?.trim();

    const filteredSongs = spotifyData.filter((song) => {
      const songDanceability = parseFloat(song.danceability);
      const songEnergy = parseFloat(song.energy);
      const songLoudness = parseFloat(song.loudness);
      const songValence = parseFloat(song.valence);
      const songSpeechiness = parseFloat(song.speechiness);
      const songAcousticness = parseFloat(song.acousticness);
      // const songRegion = song.Continent?.trim();

      return (
        Math.abs(songDanceability - danceability) <= 0.1 &&
        Math.abs(songEnergy - energy) <= 0.1 &&
        Math.abs(songValence - valence) <= 0.1 &&
        Math.abs(songLoudness - loudness) <= 0.1
        // Math.abs(songSpeechiness - speechiness) <= 0.2 &&
        // Math.abs(songAcousticness - acousticness) <= 0.2 &&
        // (!region || songRegion === region)
      );
    });

    console.log("Filtered Songs:", filteredSongs); // Debug filtered songs
    setSongs(filteredSongs.slice(0, 5)); // Get first 5 songs
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

      {songs.length > 0 && (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.track_id}
          renderItem={({ item }) => (
            <View style={styles.songItem}>
              <Text
                style={styles.songName}
                onPress={() =>
                  Linking.openURL(
                    `https://open.spotify.com/track/${item.track_id}`
                  )
                }
              >
                {item.track_name}
              </Text>
              <Text style={styles.artist}>{item.artists}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  responseContainer: {
    padding: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    width: "80%",
  },
  responseText: {
    fontSize: 16,
    color: "#333",
  },
  songItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  songName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  artist: {
    fontSize: 14,
    color: "#666",
  },
  songUrl: {
    fontSize: 12,
    color: "#888",
  },
});
