package com.battletext.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/", "/index.html", "/static/**", "/api/auth/user",
                                                                "/api/game/bots",
                                                                "/api/game/playCpu", "/api/game/playHuman",
                                                                "/api/game/timeout", "/*.js", "/*.css", "/*.ico")
                                                .permitAll()
                                                .anyRequest().authenticated())
                                .oauth2Login(oauth2 -> oauth2
                                                .defaultSuccessUrl("/", true))
                                .logout(logout -> logout
                                                .logoutUrl("/logout")
                                                .logoutSuccessUrl("/")
                                                .permitAll())
                                .csrf(csrf -> csrf.disable());

                return http.build();
        }
}
