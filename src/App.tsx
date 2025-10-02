import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import RoomGame from "./pages/RoomGame";
import MultiplayerRoomGame from "./pages/MultiplayerRoomGame";
import { GameManager } from "./game/GameManager";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/room/:code/game" element={<RoomGame />} />
          <Route path="/room/:code/multiplayer" element={<MultiplayerRoomGame />} />
          <Route path="/game" element={<GameManager />} />
          <Route path="/game/:level" element={<GameManager />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;