package com.battletext.service;

import com.battletext.model.BotConfig;
import com.battletext.model.BotLevel;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class BotRegistry {

    private final Map<String, BotConfig> bots = new LinkedHashMap<>();

    public BotRegistry() {
        bots.put("Adam", new BotConfig(
                "Adam",
                "🤖",
                "The original challenger. Straightforward but relentless.",
                Arrays.asList(
                        new BotLevel(0, "Rookie", "Still learning the ropes.", 1, 30, null),
                        new BotLevel(1, "Apprentice", "Getting warmed up.", 2, 40, null),
                        new BotLevel(2, "Letter Lock", "Every word must start with 'G'!", 3, 30, "FIXED_LETTER:g"),
                        new BotLevel(3, "Balanced", "A fair fight.", 4, 50, null),
                        new BotLevel(4, "Clever", "Picks words with intention.", 5, 60, null),
                        new BotLevel(5, "Wordsmith", "Prefers long powerful words.", 6, 70, "MIN_WORD_LENGTH:7"),
                        new BotLevel(6, "Veteran", "Decades of word battle experience.", 7, 80, null),
                        new BotLevel(7, "God Mode", "CPU earns double points — good luck!", 8, 100, "DOUBLE_SCORE"))));

        bots.put("Eve", new BotConfig(
                "Eve",
                "🤖",
                "Cunning and unpredictable. Every match is a surprise.",
                Arrays.asList(
                        new BotLevel(0, "Curious", "Just exploring.", 1, 25, null),
                        new BotLevel(1, "Playful", "Toying with you.", 3, 40, null),
                        new BotLevel(2, "Quick Q Hunt", "Every word must start with 'Q'!", 4, 30, "FIXED_LETTER:q"),
                        new BotLevel(3, "Sharp", "Strikes with precision.", 6, 60, null),
                        new BotLevel(4, "Ruthless", "CPU earns double points — good luck!", 8, 80, "DOUBLE_SCORE"))));

        bots.put("Lucifer", new BotConfig(
                "Lucifer",
                "😈",
                "The fallen one. Master of long, impossible words.",
                Arrays.asList(
                        new BotLevel(0, "Damned", "Even hell has rules.", 8, 70, "MIN_WORD_LENGTH:10"),
                        new BotLevel(1, "Tormented", "Words that haunt your dreams.", 8, 80, "ENDS_WITH:qxyz"),
                        new BotLevel(2, "The Devil", "Unforgivable. Good luck.", 8, 100, "MIN_WORD_LENGTH:12:ENDS_WITH:qxyz"))));
    }

    public Map<String, BotConfig> getBots() {
        return bots;
    }

    public BotConfig getBot(String name) {
        return bots.get(name);
    }
}