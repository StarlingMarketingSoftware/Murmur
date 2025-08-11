const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('OpenAI request timed out')), timeoutMs);
        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

export const fetchOpenAi = async (
    model: string,
    prompt: string,
    content: string
): Promise<string> => {
    const controller = new AbortController();
    const timeoutMs = 12000; // 12s hard limit for location parse to avoid UI hangs
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content,
                    },
                ],
            }),
            signal: controller.signal,
        });

        const res = await response.json();

        if (!response.ok) {
            throw new Error(res.error?.message || 'Open AI request failed');
        }
        return res.choices[0].message.content;
    } finally {
        clearTimeout(timeoutId);
    }
};
