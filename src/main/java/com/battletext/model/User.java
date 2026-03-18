package com.battletext.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String googleId;

    private String email;

    @Column(nullable = false)
    private String username;

    private String icon;

    @Column(nullable = false)
    private int gamesPlayed = 0;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private int gamesWon = 0;

    @ElementCollection
    @CollectionTable(name = "user_unique_words", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "word")
    private Set<String> uniqueWords = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "user_unlocked_levels", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "bot_name")
    @Column(name = "unlocked_level_indices")
    private Map<String, String> unlockedLevels = new TreeMap<>();

    public User() {}

    public User(String googleId, String email, String username, String icon) {
        this.googleId = googleId;
        this.email = email;
        this.username = username;
        this.icon = icon;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
    }

    public Set<Integer> getUnlockedLevelIndices(String botName) {
        String indices = unlockedLevels.get(botName);
        Set<Integer> result = new HashSet<>();
        if (indices != null && !indices.isEmpty()) {
            for (String s : indices.split(",")) {
                try {
                    result.add(Integer.parseInt(s.trim()));
                } catch (NumberFormatException ignored) {}
            }
        }
        return result;
    }

    public void unlockLevel(String botName, int levelIndex) {
        Set<Integer> current = getUnlockedLevelIndices(botName);
        current.add(levelIndex);
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Integer i : current) {
            if (!first) sb.append(",");
            sb.append(i);
            first = false;
        }
        unlockedLevels.put(botName, sb.toString());
    }

    public boolean isLevelUnlocked(String botName, int levelIndex) {
        return getUnlockedLevelIndices(botName).contains(levelIndex);
    }
}
