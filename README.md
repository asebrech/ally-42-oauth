# AdonisJS Ally Driver for 42 School OAuth2

[![npm version](https://badge.fury.io/js/ally-42-oauth.svg)](https://badge.fury.io/js/ally-42-oauth)
[![license](https://img.shields.io/npm/l/ally-42-oauth.svg)](https://github.com/asebrech/ally-42-oauth/blob/main/LICENSE)

This package provides an AdonisJS Ally driver for 42 School's Intra OAuth2 authentication system.

## Installation

```bash
npm install ally-42-oauth
```

## Configuration

### Step 1: Create a 42 Application

1. Go to [42 Intra Applications](https://profile.intra.42.fr/oauth/applications/new)
2. Create a new application with:
   - **Name**: Your application name
   - **Redirect URI**: Your callback URL (e.g., `http://localhost:3333/auth/42/callback`)
   - **Scopes**: Select the scopes you need (at minimum `public`)

### Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
FORTY_TWO_CLIENT_ID=your_client_id_from_42
FORTY_TWO_CLIENT_SECRET=your_client_secret_from_42
```

### Step 3: Configure Ally

Update your `config/ally.ts` file:

```typescript
import { defineConfig } from '@adonisjs/ally'
import { FortyTwoDriverService, type FortyTwoDriverConfig } from 'ally-42-oauth'
import env from '#start/env'

const allyConfig = defineConfig({
  // ... other drivers
  
  fortyTwo: FortyTwoDriverService({
    clientId: env.get('FORTY_TWO_CLIENT_ID'),
    clientSecret: env.get('FORTY_TWO_CLIENT_SECRET'),
    callbackUrl: 'http://localhost:3333/auth/42/callback',
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders {
    // ... other providers
    fortyTwo: {
      config: FortyTwoDriverConfig
      implementation: FortyTwoDriver
    }
  }
}
```

## Usage

### Basic Authentication Flow

```typescript
import { HttpContext } from '@adonisjs/core/http'

export default class AuthController {
  /**
   * Redirect to 42 for authentication
   */
  redirect({ ally }: HttpContext) {
    return ally.use('fortyTwo').redirect()
  }

  /**
   * Handle the callback from 42
   */
  async callback({ ally, auth, response }: HttpContext) {
    const fortyTwo = ally.use('fortyTwo')

    // Check if user denied access
    if (fortyTwo.accessDenied()) {
      return response.badRequest('Access denied')
    }

    // Check if there was a state mismatch
    if (fortyTwo.stateMisMatch()) {
      return response.badRequest('State mismatch')
    }

    // Check if there was an error during authentication
    if (fortyTwo.hasError()) {
      return response.badRequest('Authentication error')
    }

    // Get user details
    const user = await fortyTwo.user()
    
    // User details available:
    // user.id - 42 user ID
    // user.nickName - 42 login
    // user.name - Display name
    // user.email - Email address
    // user.avatarUrl - Profile picture URL
    // user.original - Full user data from 42 API
    // user.token - Access token for API calls
    
    // Find or create user in your database
    // ... your user creation logic
    
    return response.redirect('/dashboard')
  }
}
```

### Using Scopes

You can request additional scopes when redirecting:

```typescript
export default class AuthController {
  redirect({ ally }: HttpContext) {
    return ally.use('fortyTwo').redirect((request) => {
      request.scopes(['public', 'projects', 'profile'])
    })
  }
}
```

### Making API Calls

After authentication, you can use the access token to make API calls to the 42 API:

```typescript
async function getUserProjects(accessToken: string) {
  const response = await fetch('https://api.intra.42.fr/v2/me/projects', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  return response.json()
}
```

## Available User Data

The driver returns the following user information:

```typescript
{
  id: number,              // 42 user ID
  nickName: string,        // 42 login (e.g., "jdoe")
  name: string,            // Display name (e.g., "John Doe")
  email: string,           // Email address
  emailVerificationState: 'unsupported',
  avatarUrl: string | null, // Profile picture URL
  original: object,        // Complete user data from 42 API
  token: {
    token: string,         // Access token
    type: 'bearer'
  }
}
```

## 42 API Endpoints

This driver uses the following 42 API endpoints:

- **Authorization**: `https://api.intra.42.fr/oauth/authorize`
- **Token Exchange**: `https://api.intra.42.fr/oauth/token`
- **User Info**: `https://api.intra.42.fr/v2/me`

## Available Scopes

Common scopes available for 42 applications:

- `public` - Access to public information (default)
- `projects` - Access to user projects
- `profile` - Access to full profile information
- `elearning` - Access to e-learning data

Refer to the [42 API documentation](https://api.intra.42.fr/apidoc) for a complete list of available scopes.

## Error Handling

The driver handles common OAuth2 errors:

```typescript
async callback({ ally, response }: HttpContext) {
  const fortyTwo = ally.use('fortyTwo')

  if (fortyTwo.accessDenied()) {
    return response.badRequest('User denied access')
  }

  if (fortyTwo.stateMisMatch()) {
    return response.badRequest('State mismatch - possible CSRF attack')
  }

  if (fortyTwo.hasError()) {
    return response.badRequest('Authentication error occurred')
  }

  // Continue with authentication...
}
```

## TypeScript Support

This package includes full TypeScript definitions. The main types exported are:

- `FortyTwoDriver` - The driver class
- `FortyTwoDriverConfig` - Configuration interface
- `FortyTwoDriverAccessToken` - Access token interface
- `FortyTwoDriverScopes` - Available scopes
- `FortyTwoDriverService` - Factory function

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [42 API Documentation](https://api.intra.42.fr/apidoc)
- [42 OAuth Applications](https://profile.intra.42.fr/oauth/applications)
- [AdonisJS Ally Documentation](https://docs.adonisjs.com/guides/authentication/social-authentication)