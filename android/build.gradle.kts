plugins {
    kotlin("jvm") version "2.3.21"
}

group = "com.hydrapayments"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.json:json:20250107")
    implementation(kotlin("stdlib"))

    testImplementation("org.junit.jupiter:junit-jupiter:5.12.0")
    testImplementation(kotlin("test"))
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile> {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

tasks.test {
    useJUnitPlatform()
}
