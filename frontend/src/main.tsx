import { createTheme, DirectionProvider, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";
import App from "./App.tsx";

const theme = createTheme({
  primaryColor: "indigo",
  fontFamily: "DM Sans, sans-serif",
  headings: { fontFamily: "Plus Jakarta Sans, DM Sans, sans-serif" },
  defaultRadius: "md",
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <DirectionProvider initialDirection="rtl">
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-left" />
        <App />
      </MantineProvider>
    </DirectionProvider>
  </StrictMode>,
);
