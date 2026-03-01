package com.battletext.controller;

import com.battletext.model.GameState;
import com.battletext.model.TurnResult;
import com.battletext.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired
    private GameService gameService;

    // Simple in-memory storage for active games
    private final Map<String, GameState> activeGames = new ConcurrentHashMap<>();

    @PostMapping("/start")
    public GameState startGame(@RequestParam(defaultValue = "1") int difficulty,
            @RequestParam(defaultValue = "50") int targetScore,
            @RequestParam(defaultValue = "Adam") String cpuName) {
        GameState gameState = new GameState();
        gameState.setId(UUID.randomUUID().toString());
        gameState.setDifficultyLevel(Math.max(1, Math.min(8, difficulty)));
        gameState.setTargetScore(targetScore);
        gameState.setHumanScore(0);
        gameState.setCpuScore(0);
        gameState.setCpuName(cpuName);
        gameState.setGameOver(false);
        // Start with a random letter from a to z
        char startChar = (char) ('a' + new java.util.Random().nextInt(26));
        gameState.setRequiredStartingLetter(String.valueOf(startChar));

        activeGames.put(gameState.getId(), gameState);
        return gameState;
    }

    @PostMapping("/playHuman")
    public TurnResult playHuman(@RequestParam String gameId, @RequestParam String word) {
        GameState gameState = activeGames.get(gameId);
        if (gameState == null) {
            TurnResult result = new TurnResult();
            result.setValid(false);
            result.setMessage("Game not found.");
            return result;
        }

        return gameService.processHumanTurn(gameState, word);
    }

    @PostMapping("/playCpu")
    public TurnResult playCpu(@RequestParam String gameId) {
        GameState gameState = activeGames.get(gameId);
        if (gameState == null) {
            TurnResult result = new TurnResult();
            result.setValid(false);
            result.setMessage("Game not found.");
            return result;
        }

        return gameService.processCpuTurn(gameState);
    }

    @PostMapping("/timeout")
    public GameState handleTimeout(@RequestParam String gameId) {
        GameState gameState = activeGames.get(gameId);
        if (gameState != null && !gameState.isGameOver()) {
            char newChar = (char) ('a' + new java.util.Random().nextInt(26));
            gameState.setRequiredStartingLetter(String.valueOf(newChar));
        }
        return gameState;
    }
}
