# WebSockets

The WebSocket API provides **real-time streaming updates** for token data such as token profiles, boosts, and community take-overs.

## GET /token-profiles/latest/v1

> Get the latest token profiles

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/token-profiles/latest/v1": {
      "get": {
        "tags": ["Token Profiles"],
        "summary": "Get the latest token profiles",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TokenProfileHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "TokenProfileHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/TokenProfile" }
          }
        }
      },
      "TokenProfile": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "icon": { "type": "string", "format": "uri" },
          "header": { "type": "string", "format": "uri", "nullable": true },
          "description": { "type": "string", "nullable": true },
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "nullable": true },
                "label": { "type": "string", "nullable": true },
                "url": { "type": "string", "format": "uri" }
              }
            },
            "nullable": true
          }
        }
      }
    }
  }
}
```

## GET /token-profiles/recent-updates/v1

> Get recently updated token profiles

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/token-profiles/recent-updates/v1": {
      "get": {
        "tags": ["Token Profiles"],
        "summary": "Get recently updated token profiles",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TokenProfileHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "TokenProfileHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/TokenProfile" }
          }
        }
      },
      "TokenProfile": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "icon": { "type": "string", "format": "uri" },
          "header": { "type": "string", "format": "uri", "nullable": true },
          "description": { "type": "string", "nullable": true },
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "nullable": true },
                "label": { "type": "string", "nullable": true },
                "url": { "type": "string", "format": "uri" }
              }
            },
            "nullable": true
          }
        }
      }
    }
  }
}
```

## GET /community-takeovers/latest/v1

> Get the latest token community takeovers

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/community-takeovers/latest/v1": {
      "get": {
        "tags": ["Community Takeovers"],
        "summary": "Get the latest token community takeovers",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CommunityTakeoverHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "CommunityTakeoverHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/CommunityTakeover" }
          }
        }
      },
      "CommunityTakeover": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "icon": { "type": "string", "format": "uri" },
          "header": { "type": "string", "format": "uri", "nullable": true },
          "description": { "type": "string", "nullable": true },
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "nullable": true },
                "label": { "type": "string", "nullable": true },
                "url": { "type": "string", "format": "uri" }
              }
            },
            "nullable": true
          },
          "claimDate": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

## GET /ads/latest/v1

> Get the latest ads

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/ads/latest/v1": {
      "get": {
        "tags": ["Ads"],
        "summary": "Get the latest ads",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AdsHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "AdsHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Ad" }
          }
        }
      },
      "Ad": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "date": { "type": "string", "format": "date-time" },
          "type": { "type": "string" },
          "durationHours": { "type": "number", "nullable": true },
          "impressions": { "type": "number", "nullable": true }
        }
      }
    }
  }
}
```

## GET /token-boosts/latest/v1

> Get the latest boosted tokens

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/token-boosts/latest/v1": {
      "get": {
        "tags": ["Token Boosts"],
        "summary": "Get the latest boosted tokens",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BoostHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "BoostHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Boost" }
          }
        }
      },
      "Boost": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "amount": { "type": "number" },
          "totalAmount": { "type": "number" },
          "icon": { "type": "string", "format": "uri", "nullable": true },
          "header": { "type": "string", "format": "uri", "nullable": true },
          "description": { "type": "string", "nullable": true },
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "nullable": true },
                "label": { "type": "string", "nullable": true },
                "url": { "type": "string", "format": "uri" }
              }
            },
            "nullable": true
          }
        }
      }
    }
  }
}
```

## GET /token-boosts/top/v1

> Get the tokens with most active boosts

```json
{
  "openapi": "3.0.3",
  "info": { "title": "DEX Screener Websocket API", "version": "1.0.0" },
  "servers": [{ "url": "wss://api.dexscreener.com" }],
  "paths": {
    "/token-boosts/top/v1": {
      "get": {
        "tags": ["Token Boosts"],
        "summary": "Get the tokens with most active boosts",
        "responses": {
          "101": {
            "description": "Connection Established",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BoostHandshakeResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "BoostHandshakeResponse": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer" },
          "data": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Boost" }
          }
        }
      },
      "Boost": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri" },
          "chainId": { "type": "string" },
          "tokenAddress": { "type": "string" },
          "amount": { "type": "number" },
          "totalAmount": { "type": "number" },
          "icon": { "type": "string", "format": "uri", "nullable": true },
          "header": { "type": "string", "format": "uri", "nullable": true },
          "description": { "type": "string", "nullable": true },
          "links": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string", "nullable": true },
                "label": { "type": "string", "nullable": true },
                "url": { "type": "string", "format": "uri" }
              }
            },
            "nullable": true
          }
        }
      }
    }
  }
}
```
