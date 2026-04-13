package com.battletext.service;

import com.battletext.model.BotConfig;
import com.battletext.model.GameState;
import com.battletext.model.TurnResult;
import com.battletext.model.User;
import com.battletext.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameService {
    private final Map<Character, List<String>> dictionary = new HashMap<>();
    private final Random random = new Random();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BotRegistry botRegistry;

    private static final int UNIQUE_WORD_BONUS = 5;

    @PostConstruct
    public void init() {
        String resourcePath = "/words_alpha.txt";
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is != null) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                String line;
                while ((line = reader.readLine()) != null) {
                    String word = line.trim().toLowerCase();
                    if (word.length() > 0 && word.matches("^[a-z]+$")) {
                        char firstChar = word.charAt(0);
                        dictionary.computeIfAbsent(firstChar, k -> new ArrayList<>()).add(word);
                    }
                }
            } else {
                System.err.println("Failed to load /words_alpha.txt");
            }
        } catch (Exception e) {
            System.err.println("Failed to load words: " + e.getMessage());
        }
        
        // Sort each list by length descending for AI selection
        for (List<String> list : dictionary.values()) {
            list.sort(Comparator.comparingInt(String::length).reversed());
        }
        System.out.println("Loaded dictionary with " + dictionary.size() + " letter groups.");
    }

    public boolean isValidWord(String word) {
        if (word == null || word.isEmpty())
            return false;
        word = word.toLowerCase();
        char firstChar = word.charAt(0);
        List<String> words = dictionary.get(firstChar);
        return words != null && words.contains(word);
    }

    // -------------------------------------------------------------------------
    // Gimmick helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the forced letter if the gimmick is FIXED_LETTER:<X>, otherwise null.
     */
    private Character getFixedLetter(String gimmick) {
        if (gimmick != null && gimmick.startsWith("FIXED_LETTER:")) {
            return gimmick.charAt("FIXED_LETTER:".length());
        }
        return null;
    }

    private int getMinWordLength(String gimmick) {
        if (gimmick != null && gimmick.startsWith("MIN_WORD_LENGTH:")) {
            try {
                String suffix = gimmick.substring("MIN_WORD_LENGTH:".length());
                if (suffix.contains(":")) {
                    suffix = suffix.split(":")[0];
                }
                return Integer.parseInt(suffix);
            } catch (NumberFormatException ignored) {
            }
        }
        return 1; // no restriction
    }

    private boolean isDoubleScore(String gimmick) {
        return "DOUBLE_SCORE".equals(gimmick);
    }

    private String getEndsWithLetter(String gimmick) {
        if (gimmick != null && gimmick.startsWith("ENDS_WITH:")) {
            return gimmick.substring("ENDS_WITH:".length());
        }
        if (gimmick != null && gimmick.contains("ENDS_WITH:")) {
            int idx = gimmick.indexOf("ENDS_WITH:");
            return gimmick.substring(idx + "ENDS_WITH:".length());
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Turn processing
    // -------------------------------------------------------------------------

    public TurnResult processHumanTurn(GameState gameState, String humanWord) {
        return processHumanTurn(gameState, humanWord, null);
    }

    public TurnResult processHumanTurn(GameState gameState, String humanWord, String userGoogleId) {
        TurnResult result = new TurnResult();
        humanWord = humanWord.toLowerCase().trim();
        String gimmick = gameState.getActiveGimmick();

        // 1. Validate game state
        if (gameState.isGameOver()) {
            result.setValid(false);
            result.setMessage("Game is already over.");
            return result;
        }

        // 2. Determine the required starting letter (gimmick may override)
        String required = gameState.getRequiredStartingLetter();
        if (required != null && !required.equals("?")) {
            // FIXED_LETTER gimmick — the required letter is always the fixed one
            Character fixedLetter = getFixedLetter(gimmick);
            String effectiveRequired = (fixedLetter != null)
                    ? String.valueOf(fixedLetter)
                    : required;

            if (!humanWord.startsWith(effectiveRequired)) {
                result.setValid(false);
                result.setMessage("Word must start with '" + effectiveRequired.toUpperCase() + "'.");
                return result;
            }
        }

        if (!isValidWord(humanWord)) {
            result.setValid(false);
            result.setMessage("Not a valid word.");
            return result;
        }

        if (gameState.isWordUsed(humanWord)) {
            result.setValid(false);
            result.setMessage("Word already used.");
            return result;
        }

        // 3. Check for unique word and calculate bonus
        boolean isUniqueWord = false;
        int uniqueWordBonus = 0;

        if (userGoogleId != null) {
            Optional<User> userOpt = userRepository.findByGoogleId(userGoogleId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (!user.getUniqueWords().contains(humanWord)) {
                    isUniqueWord = true;
                    uniqueWordBonus = UNIQUE_WORD_BONUS;
                    user.getUniqueWords().add(humanWord);
                    userRepository.save(user);
                }
            }
        }

        // 4. Human turn succeeds
        int humanScore = humanWord.length() + uniqueWordBonus;
        gameState.setHumanScore(gameState.getHumanScore() + humanScore);
        gameState.addUsedWord(humanWord);
        gameState.setLastWordPlayed(humanWord);

        // Next required letter: fixed gimmick overrides the chain rule
        Character fixedLetter = getFixedLetter(gimmick);
        if (fixedLetter != null) {
            gameState.setRequiredStartingLetter(String.valueOf(fixedLetter));
        } else {
            gameState.setRequiredStartingLetter(String.valueOf(humanWord.charAt(humanWord.length() - 1)));
        }

        result.setValid(true);
        result.setHumanWord(humanWord);
        result.setHumanWordScore(humanScore);
        result.setUniqueWord(isUniqueWord);
        result.setUniqueWordBonus(uniqueWordBonus);

        if (gameState.getHumanScore() >= gameState.getTargetScore()) {
            gameState.setGameOver(true);
            gameState.setWinner("HUMAN");
            unlockNextLevel(gameState, userGoogleId);
        }

        result.setGameState(gameState);
        return result;
    }

    public TurnResult processCpuTurn(GameState gameState) {
        TurnResult result = new TurnResult();
        result.setValid(true); // CPU moves are inherently valid

        if (gameState.isGameOver()) {
            result.setGameState(gameState);
            return result;
        }

        String gimmick = gameState.getActiveGimmick();

        // Determine the letter the CPU must start with (gimmick may override)
        Character fixedLetter = getFixedLetter(gimmick);
        char cpuStartChar = (fixedLetter != null)
                ? fixedLetter
                : gameState.getRequiredStartingLetter().charAt(0);

        String cpuWord = determineCpuWord(gameState, cpuStartChar);

        if (cpuWord == null) {
            // CPU skips — next starting letter obeys gimmick
            char nextLetter = (fixedLetter != null) ? fixedLetter : (char) ('a' + random.nextInt(26));
            gameState.setRequiredStartingLetter(String.valueOf(nextLetter));
            result.setCpuWord("SKIPPED!");
            result.setCpuWordScore(0);
        } else {
            int rawScore = cpuWord.length();
            int cpuScore = isDoubleScore(gimmick) ? rawScore * 2 : rawScore;

            gameState.setCpuScore(gameState.getCpuScore() + cpuScore);
            gameState.addUsedWord(cpuWord);
            gameState.setLastWordPlayed(cpuWord);

            // Next required letter: gimmick or chain
            if (fixedLetter != null) {
                gameState.setRequiredStartingLetter(String.valueOf(fixedLetter));
            } else {
                gameState.setRequiredStartingLetter(String.valueOf(cpuWord.charAt(cpuWord.length() - 1)));
            }

            result.setCpuWord(cpuWord);
            result.setCpuWordScore(cpuScore);

            if (gameState.getCpuScore() >= gameState.getTargetScore()) {
                gameState.setGameOver(true);
                gameState.setWinner("CPU");
            }
        }

        result.setGameState(gameState);
        return result;
    }

    private String determineCpuWord(GameState gameState, char startingLetter) {
        String gimmick = gameState.getActiveGimmick();
        int difficulty = gameState.getDifficultyLevel(); // 1 to 8

        // Skip chance for low-difficulty bots only (remove for better gameplay)
        if (difficulty == 1) {
            int skipChance = 5; // Level 1: 5% skip chance
            if (random.nextInt(100) < skipChance) {
                return null;
            }
        }

        List<String> pool = dictionary.getOrDefault(startingLetter, Collections.emptyList());
        if (pool.isEmpty())
            return null;

        // Filter out used words
        List<String> available = pool.stream()
                .filter(w -> !gameState.isWordUsed(w))
                .collect(Collectors.toList());

        if (available.isEmpty())
            return null;

        // Apply MIN_WORD_LENGTH gimmick filter
        int minLen = getMinWordLength(gimmick);
        String endsWith = getEndsWithLetter(gimmick);
        
        List<String> gimmickFiltered = available.stream()
                .filter(w -> w.length() >= minLen)
                .collect(Collectors.toList());
        
        if (endsWith != null && !endsWith.isEmpty()) {
            final String ew = endsWith;
            List<String> endFiltered = gimmickFiltered.stream()
                    .filter(w -> ew.indexOf(w.charAt(w.length() - 1)) >= 0)
                    .collect(Collectors.toList());
            if (!endFiltered.isEmpty()) {
                gimmickFiltered = endFiltered;
            }
        }
        
        // Fallback to full available list if gimmick filter leaves nothing
        if (!gimmickFiltered.isEmpty()) {
            available = gimmickFiltered;
        }

        // Define target lengths roughly based on difficulty
        int minTargetLength = Math.min(difficulty + 2, 8);
        int maxTargetLength = difficulty == 8 ? 20 : difficulty + 4;

        List<String> validTargets = available.stream()
                .filter(w -> {
                    int len = w.length();
                    if (difficulty == 8)
                        return len >= 7;
                    return len >= minTargetLength && len <= maxTargetLength;
                })
                .collect(Collectors.toList());

        if (!validTargets.isEmpty()) {
            return validTargets.get(random.nextInt(validTargets.size()));
        }

        // Fallback: always use available words if no valid targets
        if (!available.isEmpty()) {
            if (difficulty >= 5) {
                return available.get(random.nextInt(Math.min(10, available.size())));
            } else {
                return available.get(available.size() - 1 - random.nextInt(Math.min(10, available.size())));
            }
        }
        
        return null;
    }

private void unlockNextLevel(GameState gameState, String userGoogleId) {
        String botName = gameState.getBotName();
        int currentLevel = gameState.getLevelIndex();
        int nextLevel = currentLevel + 1;
        
        BotConfig bot = botRegistry.getBot(botName);
        if (bot == null || nextLevel >= bot.getLevels().size()) {
            return;
        }
        
        // Determine Google ID to use – if none provided, fall back to "default"
        String googleId = userGoogleId != null ? userGoogleId : "default";
        Optional<User> userOpt = userRepository.findByGoogleId(googleId);
        
        // If user not found, create a minimal placeholder user
        userOpt.ifPresent(user -> {
            user.unlockLevel(botName, nextLevel);
            userRepository.save(user);
        });
        if (!userOpt.isPresent()) {
            User defaultUser = new User();
            defaultUser.setGoogleId(googleId);
            // Minimal setup for placeholder – in a real app these would be configured
            defaultUser.setUsername("DefaultUser");
            defaultUser.setEmail("");
            defaultUser.setIcon("");
            // Unlock the level for the placeholder user and persist
            defaultUser.unlockLevel(botName, nextLevel);
            userRepository.save(defaultUser);
        }
    }
}
