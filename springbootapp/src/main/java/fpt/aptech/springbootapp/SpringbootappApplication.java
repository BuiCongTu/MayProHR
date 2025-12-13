package fpt.aptech.springbootapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SpringbootappApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringbootappApplication.class, args);
    }

}
