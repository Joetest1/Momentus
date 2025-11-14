/**
 * HRVAnalyzer - Heart Rate Variability Analysis Engine
 * Processes H10 heart rate data to detect meditation depth and entrainment
 */
class HRVAnalyzer {
    constructor() {
        this.heartRateBuffer = [];
        this.rrIntervals = [];
        this.analysisWindow = 60; // seconds
        this.samplingRate = 1; // Hz (H10 typically sends 1 reading per second)
        this.lastHeartRate = null;
        this.lastTimestamp = null;
        
        // Analysis thresholds
        this.thresholds = {
            deepMeditation: {
                rmssd: 40, // ms - higher indicates parasympathetic activation
                coherence: 0.6, // 0-1 scale
                stability: 0.8 // 0-1 scale
            },
            entrainment: {
                synchronization: 0.7, // audio-physiological sync
                breathingCoherence: 0.5
            }
        };
        
        this.currentState = {
            meditationDepth: 0, // 0-1 scale
            coherenceScore: 0,
            entrainmentLevel: 0,
            breathingRate: 0,
            hrvMetrics: {}
        };
    }

    /**
     * Process new heart rate reading from H10
     * @param {number} heartRate - BPM
     * @param {string} timestamp - ISO timestamp
     */
    processHeartRate(heartRate, timestamp = new Date().toISOString()) {
        const currentTime = new Date(timestamp).getTime();
        
        // Add to buffer
        this.heartRateBuffer.push({
            heartRate,
            timestamp: currentTime,
            isoTimestamp: timestamp
        });

        // Calculate RR interval if we have previous reading
        if (this.lastHeartRate && this.lastTimestamp) {
            const timeDiff = currentTime - this.lastTimestamp;
            const avgHeartRate = (heartRate + this.lastHeartRate) / 2;
            const rrInterval = (60 / avgHeartRate) * 1000; // ms
            
            this.rrIntervals.push({
                interval: rrInterval,
                timestamp: currentTime,
                heartRate: avgHeartRate
            });
        }

        this.lastHeartRate = heartRate;
        this.lastTimestamp = currentTime;

        // Keep buffer size manageable (5 minutes max)
        const maxBufferSize = 300;
        if (this.heartRateBuffer.length > maxBufferSize) {
            this.heartRateBuffer.shift();
        }
        if (this.rrIntervals.length > maxBufferSize) {
            this.rrIntervals.shift();
        }

        // Perform real-time analysis if we have enough data
        if (this.rrIntervals.length >= 30) { // Need at least 30 seconds of data
            this.performRealTimeAnalysis();
        }

        return this.currentState;
    }

    /**
     * Perform real-time HRV analysis
     */
    performRealTimeAnalysis() {
        const windowData = this.getAnalysisWindow();
        
        if (windowData.length < 10) return; // Need minimum data points

        // Calculate HRV metrics
        const hrvMetrics = this.calculateHRVMetrics(windowData);
        
        // Detect breathing patterns
        const breathingAnalysis = this.analyzeBreathingPatterns(windowData);
        
        // Calculate coherence
        const coherence = this.calculateCoherence(windowData);
        
        // Determine meditation depth
        const meditationDepth = this.assessMeditationDepth(hrvMetrics, coherence);
        
        // Update current state
        this.currentState = {
            meditationDepth,
            coherenceScore: coherence.overall,
            entrainmentLevel: coherence.entrainment,
            breathingRate: breathingAnalysis.rate,
            hrvMetrics,
            breathingCoherence: breathingAnalysis.coherence,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get data within analysis window
     */
    getAnalysisWindow() {
        const now = Date.now();
        const windowStart = now - (this.analysisWindow * 1000);
        
        return this.rrIntervals.filter(item => item.timestamp >= windowStart);
    }

    /**
     * Calculate core HRV metrics
     * @param {Array} data - RR interval data
     */
    calculateHRVMetrics(data) {
        const intervals = data.map(d => d.interval);
        const n = intervals.length;
        
        if (n < 5) return {};

        // Time domain metrics
        const mean = intervals.reduce((sum, val) => sum + val, 0) / n;
        const sdnn = Math.sqrt(intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1));
        
        // RMSSD - Root Mean Square of Successive Differences
        const successiveDiffs = [];
        for (let i = 1; i < intervals.length; i++) {
            successiveDiffs.push(Math.pow(intervals[i] - intervals[i-1], 2));
        }
        const rmssd = Math.sqrt(successiveDiffs.reduce((sum, val) => sum + val, 0) / successiveDiffs.length);
        
        // pNN50 - Percentage of successive RR intervals that differ by more than 50ms
        const nn50Count = successiveDiffs.filter(diff => Math.sqrt(diff) > 50).length;
        const pnn50 = (nn50Count / successiveDiffs.length) * 100;

        // Frequency domain analysis (simplified)
        const frequencyAnalysis = this.analyzeFrequencyDomain(intervals);

        return {
            mean: Math.round(mean),
            sdnn: Math.round(sdnn * 10) / 10,
            rmssd: Math.round(rmssd * 10) / 10,
            pnn50: Math.round(pnn50 * 10) / 10,
            ...frequencyAnalysis
        };
    }

    /**
     * Simplified frequency domain analysis
     */
    analyzeFrequencyDomain(intervals) {
        // Simplified approach - would use FFT in production
        const variability = this.calculateVariability(intervals);
        
        // Estimate LF/HF ratio based on variability patterns
        const lfHfRatio = this.estimateLFHFRatio(intervals);
        
        return {
            totalPower: Math.round(variability),
            lfHfRatio: Math.round(lfHfRatio * 100) / 100
        };
    }

    /**
     * Calculate overall variability
     */
    calculateVariability(intervals) {
        const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
        return variance;
    }

    /**
     * Estimate LF/HF ratio (simplified)
     */
    estimateLFHFRatio(intervals) {
        // This is a simplified estimation - proper FFT would be more accurate
        const shortTermVar = this.calculateVariability(intervals.slice(-10));
        const longTermVar = this.calculateVariability(intervals);
        
        return longTermVar > 0 ? shortTermVar / longTermVar : 1;
    }

    /**
     * Analyze breathing patterns from HRV
     */
    analyzeBreathingPatterns(data) {
        const intervals = data.map(d => d.interval);
        
        // Detect breathing rate from HRV oscillations
        const breathingRate = this.detectBreathingRate(intervals);
        
        // Calculate heart-breath coherence
        const coherence = this.calculateHeartBreathCoherence(intervals, breathingRate);
        
        return {
            rate: breathingRate,
            coherence: coherence,
            pattern: this.classifyBreathingPattern(breathingRate, coherence)
        };
    }

    /**
     * Detect breathing rate from HRV patterns
     */
    detectBreathingRate(intervals) {
        // Simplified breathing detection based on HRV oscillations
        // Normal resting breathing: 12-20 breaths/minute
        // Deep meditation: 6-12 breaths/minute
        
        const variabilityPeriod = this.findDominantPeriod(intervals);
        const breathingRate = variabilityPeriod > 0 ? 60 / variabilityPeriod : 12;
        
        // Constrain to reasonable range
        return Math.max(4, Math.min(25, breathingRate));
    }

    /**
     * Find dominant period in signal (simplified)
     */
    findDominantPeriod(intervals) {
        // Simplified approach - would use autocorrelation in production
        let maxAmplitude = 0;
        let dominantPeriod = 5; // default ~12 breaths/min
        
        for (let period = 3; period <= 15; period++) {
            const amplitude = this.calculateAmplitudeAtPeriod(intervals, period);
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
                dominantPeriod = period;
            }
        }
        
        return dominantPeriod;
    }

    /**
     * Calculate amplitude at specific period
     */
    calculateAmplitudeAtPeriod(intervals, period) {
        let sum = 0;
        let count = 0;
        
        for (let i = period; i < intervals.length; i++) {
            const correlation = Math.abs(intervals[i] - intervals[i - period]);
            sum += correlation;
            count++;
        }
        
        return count > 0 ? sum / count : 0;
    }

    /**
     * Calculate heart-breath coherence
     */
    calculateHeartBreathCoherence(intervals, breathingRate) {
        // Measure how well heart rate variability matches breathing pattern
        const expectedPeriod = 60 / breathingRate;
        const actualVariation = this.calculateAmplitudeAtPeriod(intervals, Math.round(expectedPeriod));
        const totalVariation = this.calculateVariability(intervals);
        
        return totalVariation > 0 ? Math.min(1, actualVariation / totalVariation) : 0;
    }

    /**
     * Classify breathing pattern
     */
    classifyBreathingPattern(rate, coherence) {
        if (rate < 8 && coherence > 0.6) return 'deep_meditative';
        if (rate < 12 && coherence > 0.4) return 'relaxed';
        if (rate < 16 && coherence > 0.3) return 'normal';
        if (rate > 18) return 'elevated';
        return 'irregular';
    }

    /**
     * Calculate overall coherence score
     */
    calculateCoherence(data) {
        const intervals = data.map(d => d.interval);
        const heartRates = data.map(d => d.heartRate);
        
        // Heart rate coherence (consistency)
        const hrCoherence = this.calculateHeartRateCoherence(heartRates);
        
        // HRV coherence (rhythm)
        const hrvCoherence = this.calculateHRVCoherence(intervals);
        
        // Overall coherence
        const overall = (hrCoherence + hrvCoherence) / 2;
        
        return {
            overall: Math.round(overall * 1000) / 1000,
            heartRate: Math.round(hrCoherence * 1000) / 1000,
            hrv: Math.round(hrvCoherence * 1000) / 1000,
            entrainment: this.calculateEntrainmentCoherence(data)
        };
    }

    /**
     * Calculate heart rate coherence
     */
    calculateHeartRateCoherence(heartRates) {
        if (heartRates.length < 5) return 0;
        
        const mean = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
        const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / heartRates.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = higher coherence
        const maxExpectedStdDev = 20; // BPM
        return Math.max(0, 1 - (stdDev / maxExpectedStdDev));
    }

    /**
     * Calculate HRV coherence
     */
    calculateHRVCoherence(intervals) {
        if (intervals.length < 10) return 0;
        
        // Measure rhythm regularity in HRV
        const differences = [];
        for (let i = 1; i < intervals.length; i++) {
            differences.push(Math.abs(intervals[i] - intervals[i-1]));
        }
        
        const meanDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
        const maxExpectedDiff = 200; // ms
        
        return Math.max(0, 1 - (meanDiff / maxExpectedDiff));
    }

    /**
     * Calculate entrainment coherence (placeholder for audio sync)
     */
    calculateEntrainmentCoherence(data) {
        // This would integrate with meditation audio timing
        // For now, return a placeholder based on breathing coherence
        const breathingAnalysis = this.analyzeBreathingPatterns(data);
        return breathingAnalysis.coherence;
    }

    /**
     * Assess meditation depth based on HRV metrics
     */
    assessMeditationDepth(hrvMetrics, coherence) {
        let depth = 0;
        
        // RMSSD indicates parasympathetic activation
        if (hrvMetrics.rmssd > this.thresholds.deepMeditation.rmssd) {
            depth += 0.3;
        }
        
        // Coherence indicates meditative state
        if (coherence.overall > this.thresholds.deepMeditation.coherence) {
            depth += 0.4;
        }
        
        // LF/HF ratio indicates autonomic balance
        if (hrvMetrics.lfHfRatio && hrvMetrics.lfHfRatio < 1) { // Parasympathetic dominance
            depth += 0.3;
        }
        
        return Math.min(1, depth);
    }

    /**
     * Get current analysis state
     */
    getCurrentState() {
        return { ...this.currentState };
    }

    /**
     * Get session summary
     */
    getSessionSummary() {
        if (this.heartRateBuffer.length === 0) return null;
        
        const heartRates = this.heartRateBuffer.map(d => d.heartRate);
        const sessionData = this.getAnalysisWindow();
        
        return {
            duration: this.heartRateBuffer.length, // seconds
            avgHeartRate: Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length),
            minHeartRate: Math.min(...heartRates),
            maxHeartRate: Math.max(...heartRates),
            finalHRVMetrics: this.calculateHRVMetrics(sessionData),
            avgMeditationDepth: this.calculateAverageDepth(),
            avgCoherence: this.calculateAverageCoherence(),
            breathingPattern: this.analyzeBreathingPatterns(sessionData),
            deepMeditationTime: this.calculateDeepMeditationTime(),
            dataPoints: this.heartRateBuffer.length
        };
    }

    /**
     * Calculate average meditation depth over session
     */
    calculateAverageDepth() {
        // This would track depth over time - simplified for now
        return this.currentState.meditationDepth;
    }

    /**
     * Calculate average coherence over session
     */
    calculateAverageCoherence() {
        return this.currentState.coherenceScore;
    }

    /**
     * Calculate time spent in deep meditation
     */
    calculateDeepMeditationTime() {
        // Simplified - would track state changes over time
        const isDeepState = this.currentState.meditationDepth > 0.7;
        return isDeepState ? Math.min(60, this.heartRateBuffer.length) : 0;
    }

    /**
     * Reset analyzer for new session
     */
    reset() {
        this.heartRateBuffer = [];
        this.rrIntervals = [];
        this.lastHeartRate = null;
        this.lastTimestamp = null;
        this.currentState = {
            meditationDepth: 0,
            coherenceScore: 0,
            entrainmentLevel: 0,
            breathingRate: 0,
            hrvMetrics: {}
        };
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HRVAnalyzer;
} else if (typeof window !== 'undefined') {
    window.HRVAnalyzer = HRVAnalyzer;
}