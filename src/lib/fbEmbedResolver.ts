type FbResolveResult = { resolvedUrl: string; aspectRatio: string };

const fbResolveCache = new Map<string, FbResolveResult>();
const fbResolveInFlight = new Map<string, Promise<FbResolveResult>>();

function heuristicResult(originalUrl: string): FbResolveResult {
  const vertical = originalUrl.includes('/reel/') || originalUrl.includes('/share/r/');
  return { resolvedUrl: originalUrl, aspectRatio: vertical ? '9/16' : '16/9' };
}

export function getCachedFbEmbed(originalUrl: string): FbResolveResult | undefined {
  return fbResolveCache.get(originalUrl);
}

export function resolveFbEmbed(originalUrl: string): Promise<FbResolveResult> {
  const cached = fbResolveCache.get(originalUrl);
  if (cached) return Promise.resolve(cached);

  const inFlight = fbResolveInFlight.get(originalUrl);
  if (inFlight) return inFlight;

  const needsResolve = originalUrl.includes('/share/r/') || originalUrl.includes('/share/v/');

  const promise: Promise<FbResolveResult> = needsResolve
    ? fetch(`/api/resolve-fb?url=${encodeURIComponent(originalUrl)}`)
        .then(r => r.json())
        .then(data => {
          const result: FbResolveResult = {
            resolvedUrl: data.resolvedUrl ?? originalUrl,
            aspectRatio: data.aspectRatio ?? '16/9',
          };
          fbResolveCache.set(originalUrl, result);
          return result;
        })
        .catch(() => {
          const result = heuristicResult(originalUrl);
          fbResolveCache.set(originalUrl, result);
          return result;
        })
    : Promise.resolve(heuristicResult(originalUrl)).then(result => {
        fbResolveCache.set(originalUrl, result);
        return result;
      });

  fbResolveInFlight.set(originalUrl, promise);
  promise.finally(() => fbResolveInFlight.delete(originalUrl));
  return promise;
}