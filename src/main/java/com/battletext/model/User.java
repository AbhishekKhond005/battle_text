package com.battletext.model;

import jakarta.persistence.*;
import lombok.Data;

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

    public User() {}

    public User(String googleId, String email, String username, String icon) {
        this.googleId = googleId;
        this.email = email;
        this.username = username;
        this.icon = icon;
        this.gamesPlayed = 0;
    }
}
