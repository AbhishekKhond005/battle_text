package com.battletext.controller;

import com.battletext.model.BotConfig;
import com.battletext.model.BotLevel;
import com.battletext.model.GameState;
import com.battletext.model.TurnResult;
import com.battletext.service.BotRegistry;
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

    @Autowired
    private BotRegistry botRegistry;

    private final Map<String, GameState> activeGames = new ConcurrentHashMap<>();

    /**
     * Returns all available bots and their levels — used by the UI to build the
     * selection screen.
     */
    @GetMapping("/bots")
    public Map<String, BotConfig> getBots() {
        return botRegistry.getBots();
    }

    @PostMapping("/start")
    public GameState startGame(
            @RequestParam(defaultValue = "Adam") String botName,
            @RequestParam(defaultValue = "0") int levelIndex) {

        BotConfig bot = botRegistry.getBot(botName);
        if (bot == null) {
            bot = botRegistry.getBots().values().iterator().next();
        }

        int safeIndex = Math.max(0, Math.min(levelIndex, bot.getLevels().size() - 1));
        BotLevel level = bot.getLevels().get(safeIndex);

        GameState gameState = new GameState();
        gameState.setId(UUID.randomUUID().toString());
        gameState.setDifficultyLevel(level.getDifficultyValue());
        gameState.setTargetScore(level.getTargetScore()); // from level itself
        gameState.setHumanScore(0);
        gameState.setCpuScore(0);
        gameState.setCpuName(bot.getName());
        gameState.setActiveGimmick(level.getGimmick());
        gameState.setActiveGimmickDescription(level.getDescription());
        gameState.setGameOver(false);

        // Determine starting letter — gimmick letters are already lowercase
        char startChar;
        if (level.getGimmick() != null && level.getGimmick().startsWith("FIXED_LETTER:")) {
            startChar = level.getGimmick().charAt("FIXED_LETTER:".length()); // already lowercase
        } else {
            startChar = (char) ('a' + new java.util.Random().nextInt(26));
        }
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
            String gimmick = gameState.getActiveGimmick();
            if (gimmick != null && gimmick.startsWith("FIXED_LETTER:")) {
                char fixedLetter = gimmick.charAt("FIXED_LETTER:".length());
                gameState.setRequiredStartingLetter(String.valueOf(fixedLetter));
            } else {
                char newChar = (char) ('a' + new java.util.Random().nextInt(26));
                gameState.setRequiredStartingLetter(String.valueOf(newChar));
            }
        }
        return gameState;
    }
}
