# Interview Assistant

An AI-powered transparent overlay assistant that helps you answer technical interview questions in real-time using screenshots and Gemini Vision API.

![Interview Assistant](https://github.com/raiajit022/Interview-Assistant/raw/main/screenshot.png)

## Features

- **Ghost Mode:** Transparent overlay that sits on top of your screen without interrupting your workflow
- **Screenshot Analysis:** Capture screenshots of technical questions using CMD+1
- **AI-Powered Answers:** Process screenshots through Gemini Vision API to get instant solutions
- **Step-by-Step Explanations:** Get concise, interview-friendly explanations for any coding problem
- **Language Agnostic:** Works with any programming language, including SQL, Python, JavaScript, etc.
- **Keyboard Shortcuts:**
  - `CMD+1` (or `CTRL+1` on Windows/Linux): Capture screen and analyze visible content
  - `CMD+H` (or `CTRL+H` on Windows/Linux): Hide/show the assistant
  - `CMD+W` (or `CTRL+W` on Windows/Linux): Quit the application

## Installation

### Prerequisites
- Node.js (v14+)
- npm (v6+)
- An API key for Google's Gemini API

### Setup

1. Clone the repository:
```
git clone https://github.com/raiajit022/Interview-Assistant.git
cd Interview-Assistant
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the project root and add your Gemini API key:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the application:
```
npm start
```

## How It Works

1. The application runs as a transparent overlay on your screen (Ghost Mode)
2. When you encounter a technical question during an interview or practice:
   - Press `CMD+1` to capture a screenshot
   - The app temporarily hides itself to avoid capturing its own interface
   - The screenshot is sent to the Gemini Vision API with carefully crafted prompts
   - Results appear on the overlay with the direct answer and step-by-step explanation
3. The app automatically resizes based on the length of the content

## Technical Details

### Core Technologies
- **Electron:** For creating the cross-platform desktop application
- **Google Gemini Vision API:** For analyzing screenshots and generating answers
- **Node.js:** For the backend logic and API communication
- **Marked:** For rendering Markdown responses

### Architecture
- **Main Process (`main.js`):** Handles desktop integration, screenshot capture, and keyboard shortcuts
- **Renderer Process (`index.html`):** Manages the user interface and API interaction
- **Prompts Engine (`prompts.js`):** Contains carefully crafted prompts to get optimal responses from Gemini

## Development

### Project Structure
```
Interview-Assistant/
├── main.js            # Electron main process
├── index.html         # UI renderer
├── prompts.js         # Gemini API prompts
├── .env               # Environment variables (not in repo)
├── package.json       # Project dependencies
└── README.md          # Project documentation
```

### Adding New Features

To add new features:

1. Fork the repository
2. Create a new branch for your feature
3. Implement and test your changes
4. Submit a pull request with a detailed description

## Privacy and Security

- Screenshots are cached temporarily (3 hours) and then automatically deleted
- Your Gemini API key is stored locally in the `.env` file (not committed to the repository)
- The app does not send any data other than screenshots to the Gemini API

## Credits

Developed by Ajit Rai

---

**Note:** This tool is designed for interview practice and learning purposes. Always understand the solutions it provides rather than simply copying them.