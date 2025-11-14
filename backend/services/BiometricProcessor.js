/**
 * BiometricProcessor - Real-time physiological data processing
 * Integrates HRV analysis with H10 heart rate monitoring
 */
class BiometricProcessor {
    constructor() {
        this.sessions = new Map(); // participantId -> session data
        this.callbacks = new Map(); // event callbacks
        this.isProcessing = false;
        
        // Load HRVAnalyzer
        if (typeof require !== 'undefined') {
            const HRVAnalyzer = require('./HRVAnalyzer');
            this.HRVAnalyzer = HRVAnalyzer;
        } else {
            this.HRVAnalyzer = window.HRVAnalyzer;
        }
    }

    /**
     * Start biometric session for participant
     * @param {string} participantId - Participant ID
     * @param {Object} participant - Participant data
     * @param {Object} options - Session options
     */
    startSession(participantId, participant, options = {}) {
        console.log(`🫀 Starting biometric session for ${participant.name}`);
        
        const analyzer = new this.HRVAnalyzer();
        
        const session = {
            participantId,
            participant,
            analyzer,
            startTime: new Date().toISOString(),
            endTime: null,
            isActive: true,
            options: {
                meditationType: options.meditationType || 'entrainment',
                duration: options.duration || 600, // 10 minutes default
                feedbackEnabled: options.feedbackEnabled !== false,
                ...options
            },
            metrics: {
                totalDataPoints: 0,
                missedReadings: 0,
                avgHeartRate: 0,
                currentState: null
            }
        };
        
        this.sessions.set(participantId, session);
        this.emit('sessionStarted', { participantId, session });
        
        return session;
    }

    /**
     * Process heart rate reading from H10
     * @param {string} participantId - Participant ID
     * @param {number} heartRate - Heart rate in BPM
     * @param {string} timestamp - ISO timestamp
     */
    processHeartRate(participantId, heartRate, timestamp = new Date().toISOString()) {
        const session = this.sessions.get(participantId);
        if (!session || !session.isActive) {
            console.warn(`No active session for participant ${participantId}`);
            return null;
        }

        try {
            // Process through HRV analyzer
            const analysisResult = session.analyzer.processHeartRate(heartRate, timestamp);
            
            // Update session metrics
            session.metrics.totalDataPoints++;
            session.metrics.currentState = analysisResult;
            
            // Calculate running average heart rate
            const totalHR = session.metrics.avgHeartRate * (session.metrics.totalDataPoints - 1) + heartRate;
            session.metrics.avgHeartRate = Math.round(totalHR / session.metrics.totalDataPoints);

            // Emit real-time update
            this.emit('heartRateProcessed', {
                participantId,
                heartRate,
                timestamp,
                analysis: analysisResult,
                session: session
            });

            // Check for significant state changes
            this.checkStateChanges(participantId, analysisResult);

            return analysisResult;

        } catch (error) {
            console.error(`Error processing heart rate for ${participantId}:`, error);
            session.metrics.missedReadings++;
            return null;
        }
    }

    /**
     * Check for significant meditation state changes
     */
    checkStateChanges(participantId, analysisResult) {
        const session = this.sessions.get(participantId);
        const { meditationDepth, coherenceScore } = analysisResult;
        
        // Deep meditation threshold crossed
        if (meditationDepth > 0.7 && (!session.lastDepth || session.lastDepth <= 0.7)) {
            this.emit('deepMeditationEntered', { 
                participantId, 
                depth: meditationDepth,
                timestamp: new Date().toISOString()
            });
        }
        
        // High coherence achieved
        if (coherenceScore > 0.8 && (!session.lastCoherence || session.lastCoherence <= 0.8)) {
            this.emit('highCoherenceAchieved', {
                participantId,
                coherence: coherenceScore,
                timestamp: new Date().toISOString()
            });
        }

        // Store last values for comparison
        session.lastDepth = meditationDepth;
        session.lastCoherence = coherenceScore;
    }

    /**
     * Get current state for participant
     * @param {string} participantId - Participant ID
     */
    getCurrentState(participantId) {
        const session = this.sessions.get(participantId);
        if (!session) return null;

        return {
            participantId,
            isActive: session.isActive,
            duration: this.getSessionDuration(participantId),
            currentAnalysis: session.analyzer.getCurrentState(),
            metrics: session.metrics,
            participant: session.participant
        };
    }

    /**
     * Get session duration in seconds
     */
    getSessionDuration(participantId) {
        const session = this.sessions.get(participantId);
        if (!session) return 0;

        const endTime = session.endTime ? new Date(session.endTime) : new Date();
        const startTime = new Date(session.startTime);
        return Math.floor((endTime - startTime) / 1000);
    }

    /**
     * End biometric session
     * @param {string} participantId - Participant ID
     */
    endSession(participantId) {
        const session = this.sessions.get(participantId);
        if (!session) return null;

        session.isActive = false;
        session.endTime = new Date().toISOString();

        // Generate session summary
        const summary = session.analyzer.getSessionSummary();
        const sessionReport = {
            participantId,
            participant: session.participant,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: this.getSessionDuration(participantId),
            options: session.options,
            summary,
            metrics: session.metrics
        };

        this.emit('sessionEnded', { participantId, report: sessionReport });

        // Keep session data for a while before cleanup
        setTimeout(() => {
            this.sessions.delete(participantId);
        }, 300000); // 5 minutes

        return sessionReport;
    }

    /**
     * Get all active sessions
     */
    getActiveSessions() {
        const activeSessions = [];
        for (const [participantId, session] of this.sessions) {
            if (session.isActive) {
                activeSessions.push(this.getCurrentState(participantId));
            }
        }
        return activeSessions;
    }

    /**
     * Generate real-time feedback for participant
     * @param {string} participantId - Participant ID
     */
    generateFeedback(participantId) {
        const session = this.sessions.get(participantId);
        if (!session || !session.options.feedbackEnabled) return null;

        const state = session.analyzer.getCurrentState();
        const feedback = {
            timestamp: new Date().toISOString(),
            participantId,
            recommendations: [],
            status: 'normal'
        };

        // Meditation depth feedback
        if (state.meditationDepth < 0.3) {
            feedback.recommendations.push({
                type: 'relaxation',
                message: 'Try to relax and let go of tension',
                priority: 'medium'
            });
            feedback.status = 'shallow';
        } else if (state.meditationDepth > 0.7) {
            feedback.recommendations.push({
                type: 'encouragement',
                message: 'Excellent! You\'re in a deep meditative state',
                priority: 'positive'
            });
            feedback.status = 'deep';
        }

        // Breathing feedback
        if (state.breathingRate > 18) {
            feedback.recommendations.push({
                type: 'breathing',
                message: 'Try to slow your breathing - aim for 6-8 breaths per minute',
                priority: 'high'
            });
        } else if (state.breathingRate < 6) {
            feedback.recommendations.push({
                type: 'breathing',
                message: 'Perfect slow breathing - maintain this rhythm',
                priority: 'positive'
            });
        }

        // Coherence feedback
        if (state.coherenceScore < 0.4) {
            feedback.recommendations.push({
                type: 'coherence',
                message: 'Focus on smooth, rhythmic breathing to improve coherence',
                priority: 'medium'
            });
        } else if (state.coherenceScore > 0.8) {
            feedback.recommendations.push({
                type: 'coherence',
                message: 'Excellent coherence! Your heart and breath are in sync',
                priority: 'positive'
            });
        }

        return feedback;
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    emit(event, data) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        const stats = {
            totalSessions: this.sessions.size,
            activeSessions: 0,
            totalDataPoints: 0,
            avgSessionDuration: 0
        };

        let totalDuration = 0;
        for (const [participantId, session] of this.sessions) {
            if (session.isActive) {
                stats.activeSessions++;
            }
            stats.totalDataPoints += session.metrics.totalDataPoints;
            totalDuration += this.getSessionDuration(participantId);
        }

        stats.avgSessionDuration = stats.totalSessions > 0 ? 
            Math.round(totalDuration / stats.totalSessions) : 0;

        return stats;
    }

    /**
     * Export session data
     * @param {string} participantId - Participant ID
     */
    exportSessionData(participantId) {
        const session = this.sessions.get(participantId);
        if (!session) return null;

        return {
            participantId,
            participant: session.participant,
            startTime: session.startTime,
            endTime: session.endTime,
            isActive: session.isActive,
            options: session.options,
            metrics: session.metrics,
            currentState: session.analyzer.getCurrentState(),
            summary: session.analyzer.getSessionSummary(),
            exportTimestamp: new Date().toISOString()
        };
    }
}

// Singleton pattern
let instance = null;

function getInstance() {
    if (!instance) {
        instance = new BiometricProcessor();
    }
    return instance;
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BiometricProcessor, getInstance };
} else if (typeof window !== 'undefined') {
    window.BiometricProcessor = BiometricProcessor;
    window.getBiometricProcessor = getInstance;
}