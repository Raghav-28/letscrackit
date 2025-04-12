# Lets Crack It

## Description
Lets Crack It is a web application designed to facilitate interview preparation and practice. It provides users with tools to manage interviews, track progress, and connect with peers.

## Installation Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/Raghav-28/lets-crack-it.git
   ```
2. Navigate to the project directory:
   ```bash
   cd lets-crack-it
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Set up Firebase configuration by adding your Firebase credentials in the appropriate files.

## Project Structure
```
letscrackit/
├── app/                  # Next.js application files
│   ├── (auth)/          # Authentication related components
│   ├── (root)/          # Root layout and pages
│   └── api/             # API routes
├── components/           # Reusable UI components
├── firebase/             # Firebase configuration and functions
├── lib/                 # Utility functions and actions
├── public/              # Static assets (images, icons)
├── styles/              # Global styles
└── README.md            # Project documentation
```

## Usage
To start the development server, run:
```bash
npm run dev
```
Visit [`http://localhost:3000`](https://letscrackit.vercel.app/) in your browser to view the application.

## Images
![Lets Crack It](public/LetsCrackIt.png)
## Tech Stack  
<img src="public/react.svg" alt="React" width="60">
<img src="public/tailwind.svg" alt="Tailwind CSS" width="60"> 
<img src="data:image/png;base64,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" alt="Next.js" width="60">
<img src="data:image/png;base64,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" alt="Firebase" width="60">

## Key Features  
- 🎤 AI-powered mock interviews  
- 📊 Performance analytics dashboard  
- 🤖 Interactive coding challenges  
- 👥 Peer feedback system  
## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.
