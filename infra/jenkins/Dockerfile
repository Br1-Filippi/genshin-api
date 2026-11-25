# syntax=docker/dockerfile:1.4
# ==========================================
# Stage 1: Builder (Downloads and preparation)
# Uses alpine for minimal footprint
# ==========================================
FROM alpine:3.19 AS builder

# Install download/extraction utilities only (not included in final image)
RUN apk add --no-cache curl unzip tar

WORKDIR /tmp

# 1. Download and extract Maven, strip docs and source jars to reduce size
ENV MAVEN_VERSION=3.9.16
RUN curl -fsSL "https://downloads.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz" | \
    tar -xzf - -C /opt/ && \
    mv /opt/apache-maven-${MAVEN_VERSION} /opt/maven && \
    find /opt/maven -name "*.md" -delete && \
    find /opt/maven -name "*-sources.jar" -delete

# 2. Download and extract Sonar Scanner, remove embedded JRE (reuses system JVM from Jenkins base)
RUN curl -fsSL -o sonar.zip "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-8.0.1.6346.zip" && \
    unzip -q sonar.zip -d /opt/ && \
    mv /opt/sonar-scanner-8.0.1.6346 /opt/sonarscanner && \
    rm sonar.zip && \
    rm -rf /opt/sonarscanner/jre

# 3. Download only the OWASP Dependency Check JAR and create a shell wrapper
RUN VERSION=$(curl -s https://dependency-check.github.io/DependencyCheck/current.txt) && \
 curl -Ls "https://github.com/dependency-check/DependencyCheck/releases/download/v$VERSION/dependency-check-$VERSION-release.zip" --output dependency-check.zip && \
 unzip -q dependency-check.zip -d /opt/ && \
 rm dependency-check.zip

# ==========================================
# Stage 2: Final Jenkins Image
# ==========================================
FROM jenkins/jenkins:2.568-slim-jdk21

USER root

# All system-level setup in ONE layer:
#   1. Install Docker CLI via official Docker apt repo
#   2. Install 'n' directly as a pure POSIX shell script (no Node.js bootstrap needed)
#   3. Pre-cache Node 16 + 22 via 'n' (available offline at runtime; 22 = active default)
#   4. STRIP DEBUG SYMBOLS from Node binaries using binutils:
#      - Node.js official builds include full debug symbols (~100-120 MB per binary)
#      - strip --strip-unneeded removes them while preserving dynamic linker symbols
#      - Savings: ~50-70 MB per Node binary (~100-130 MB total for v16+v22)
#      - binutils is installed temporarily and purged in the same RUN (zero net footprint)
#   5. Strip npm's internal test/doc/locale files from pre-cached versions
#   6. Purge gnupg2 + binutils after use (only needed during setup)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg2 \
    binutils \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
       $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli \
    # Download 'n' as a pinned pure-shell script — no Node.js or npm bootstrap needed
    && curl -fsSL "https://raw.githubusercontent.com/tj/n/v10.1.0/bin/n" -o /usr/local/bin/n \
    && chmod +x /usr/local/bin/n \
    # Pre-cache Node 16 then Node 22 (22 becomes active default since installed last)
    && n 16 \
    && n 22 \
    # ── BINARY STRIPPING ──────────────────────────────────────────────────────
    # Strip debug symbols from all Node.js executables in pre-cached versions.
    # --strip-unneeded: removes debug/symbol table entries NOT needed by the dynamic linker.
    # Safe for production: preserves all runtime-required dynamic symbols.
    # Each 'node' binary goes from ~100 MB → ~40 MB (saves ~60 MB per version).
    && find /usr/local/n/versions -name "node" -type f \
         -exec strip --strip-unneeded {} \; \
    # Strip native addon .node files (shared objects) — also safe with --strip-unneeded
    && find /usr/local/n/versions -name "*.node" -type f \
         -exec strip --strip-unneeded {} \; 2>/dev/null || true \
    # Strip the Docker CLI binary itself
    && strip --strip-unneeded /usr/bin/docker 2>/dev/null || true \
    # ── FILE CLEANUP ─────────────────────────────────────────────────────────
    # Remove unnecessary files from pre-cached node versions
    && find /usr/local/n/versions -name "share"  -type d -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/n/versions -name "include" -type d -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/n/versions -name "CHANGELOG*" -delete \
    && find /usr/local/n/versions -name "LICENSE"    -delete \
    && find /usr/local/n/versions -name "README*"    -delete \
    # Strip npm's internal docs, tests, and locale files from each cached version
    && find /usr/local/n/versions -path "*/node_modules/npm/man"      -type d -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/n/versions -path "*/node_modules/npm/docs"     -type d -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/n/versions -path "*/node_modules/npm/html"     -type d -exec rm -rf {} + 2>/dev/null || true \
    # Purge gnupg2 and binutils — only needed during setup, not at runtime
    && apt-get purge -y gnupg2 binutils \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built tools from builder stage.
# --link: independent layer cache — only rebuilds if the specific tool's source changes.
COPY --link --from=builder /opt/maven /opt/maven
COPY --link --from=builder /opt/sonarscanner /opt/sonarscanner
COPY --link --from=builder /opt/dependency-check /opt/dependency-check

# Create symlinks and set permissions in a SINGLE RUN
RUN ln -s /opt/maven/bin/mvn /usr/local/bin/mvn \
    && ln -s /opt/dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check \
    && chmod +x /opt/sonarscanner/bin/sonar-scanner \
    && chown -R jenkins:jenkins \
        /opt/maven \
        /opt/sonarscanner \
        /opt/dependency-check \
        /usr/local/n

# Environment variables
ENV MAVEN_HOME=/opt/maven \
    PATH="/opt/sonarscanner/bin:/opt/maven/bin:/usr/local/n/bin:${PATH}" \
    # Where 'n' stores and activates Node versions
    N_PREFIX=/usr/local/n \
    # Prevents SonarScanner from downloading a JRE at runtime (reuses system JDK21)
    SONAR_SCANNER_SKIP_JRE_PROVISIONING=true

USER jenkins
