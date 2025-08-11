class Analytics {
    constructor() {
        this.enabled = process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
        this.events = [];
        this.MAX_EVENTS = 1000; 
    }

    track(eventName, data = {}) {
        if (!this.enabled) return;

        const event = {
            eventName,
            data,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId()
        };

        this.events.push(event);
        if (this.events.length > this.MAX_EVENTS) {
            this.events.shift(); 
        }

        if (process.env.NODE_ENV === 'development') {
            console.debug('Analytics Event:', event);
        }

        this.sendToBackend(event);
    }

    getSessionId() {
        if (!this._sessionId) {
            this._sessionId = localStorage.getItem('analytics_session_id');
            if (!this._sessionId) {
                this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('analytics_session_id', this._sessionId);
            }
        }
        return this._sessionId;
    }

    async sendToBackend(event) {
        try {
            const response = await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });

            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }
        } catch (error) {
            console.warn('Failed to send analytics event:', error);
            this.storeFailedEvent(event);
        }
    }

    storeFailedEvent(event) {
        const failedEvents = JSON.parse(localStorage.getItem('failed_analytics_events') || '[]');
        failedEvents.push(event);
        localStorage.setItem('failed_analytics_events', JSON.stringify(failedEvents));
    }

    async retryFailedEvents() {
        const failedEvents = JSON.parse(localStorage.getItem('failed_analytics_events') || '[]');
        if (failedEvents.length === 0) return;

        const successfulEvents = [];
        
        for (const event of failedEvents) {
            try {
                await this.sendToBackend(event);
                successfulEvents.push(event);
            } catch (error) {
                console.warn('Failed to retry analytics event:', error);
            }
        }

        const remainingEvents = failedEvents.filter(
            event => !successfulEvents.includes(event)
        );
        localStorage.setItem('failed_analytics_events', JSON.stringify(remainingEvents));
    }

    getSessionData() {
        const sessionId = this.getSessionId();
        return this.events.filter(event => event.sessionId === sessionId);
    }

    clearData() {
        this.events = [];
        localStorage.removeItem('failed_analytics_events');
        localStorage.removeItem('analytics_session_id');
    }
}

export const analytics = new Analytics();
