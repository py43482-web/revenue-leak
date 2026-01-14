// Request validation utilities

export const REQUEST_SIZE_LIMITS = {
  JSON_MAX_SIZE: 1024 * 100, // 100KB for JSON payloads
  TEXT_MAX_SIZE: 1024 * 50, // 50KB for text
};

export async function validateJsonBody(request: Request): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const contentLength = request.headers.get('content-length');

    // Check content-length header if present
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > REQUEST_SIZE_LIMITS.JSON_MAX_SIZE) {
        return {
          valid: false,
          error: `Request body too large. Maximum size is ${REQUEST_SIZE_LIMITS.JSON_MAX_SIZE / 1024}KB`,
        };
      }
    }

    // Read and parse body with size check
    const text = await request.text();
    const sizeInBytes = new TextEncoder().encode(text).length;

    if (sizeInBytes > REQUEST_SIZE_LIMITS.JSON_MAX_SIZE) {
      return {
        valid: false,
        error: `Request body too large. Maximum size is ${REQUEST_SIZE_LIMITS.JSON_MAX_SIZE / 1024}KB`,
      };
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON format',
      };
    }

    return {
      valid: true,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read request body',
    };
  }
}
