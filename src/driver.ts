/*
|--------------------------------------------------------------------------
| 42 School OAuth driver for AdonisJS Ally
|--------------------------------------------------------------------------
*/

import { Oauth2Driver } from '@adonisjs/ally'
import type { HttpContext } from '@adonisjs/core/http'
import type { AllyDriverContract, AllyUserContract, ApiRequestContract } from '@adonisjs/ally/types'

/**
 * Access token returned by the 42 OAuth driver.
 */
export type FortyTwoDriverAccessToken = {
  token: string
  type: 'bearer'
  expires_in?: number
  scope?: string
  created_at?: number
}

/**
 * Scopes accepted by the 42 OAuth driver implementation.
 */
export type FortyTwoDriverScopes = 'public' | string

/**
 * The configuration accepted by the 42 OAuth driver implementation.
 */
export type FortyTwoDriverConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
}

/**
 * 42 School OAuth driver implementation for AdonisJS Ally.
 */
export class FortyTwoDriver
  extends Oauth2Driver<FortyTwoDriverAccessToken, FortyTwoDriverScopes>
  implements AllyDriverContract<FortyTwoDriverAccessToken, FortyTwoDriverScopes>
{
  /**
   * The URL for the redirect request.
   */
  protected authorizeUrl = 'https://api.intra.42.fr/oauth/authorize'

  /**
   * The URL to exchange the authorization code for the access token.
   */
  protected accessTokenUrl = 'https://api.intra.42.fr/oauth/token'

  /**
   * The URL to get the user details.
   */
  protected userInfoUrl = 'https://api.intra.42.fr/v2/me'

  protected codeParamName = 'code'
  protected errorParamName = 'error'
  protected stateCookieName = 'forty_two_oauth_state'
  protected stateParamName = 'state'
  protected scopeParamName = 'scope'
  protected scopesSeparator = ' '

  constructor(
    ctx: HttpContext,
    public config: FortyTwoDriverConfig
  ) {
    super(ctx, config)
    this.loadState()
  }

  /**
   * Configure the authorization redirect request.
   */
  protected configureRedirectRequest(request: any) {
    request.param('response_type', 'code')
  }

  /**
   * Check if the error received during redirect means "ACCESS DENIED".
   */
  accessDenied() {
    return this.ctx.request.input('error') === 'access_denied'
  }

  /**
   * Get the user details by querying the 42 API.
   */
  async user(
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<FortyTwoDriverAccessToken>> {
    const accessToken = await this.accessToken()
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Authorization', `Bearer ${accessToken.token}`)

    if (typeof callback === 'function') {
      callback(request)
    }

    const response = await request.get()
    let userData = response.data || response.body || response

    if (typeof userData === 'string') {
      try {
        userData = JSON.parse(userData)
      } catch (e) {
        throw new Error(`Failed to parse 42 API response as JSON: ${userData}`)
      }
    }

    if (!userData || typeof userData !== 'object') {
      throw new Error(`42 API returned no user data. Response status: ${response.status}`)
    }

    if (!userData.id) {
      throw new Error(
        `42 API returned invalid user data structure. User data: ${JSON.stringify(userData)}`
      )
    }

    return {
      id: userData.id,
      nickName: userData.login,
      name: userData.displayname || `${userData.first_name} ${userData.last_name}`,
      email: userData.email,
      emailVerificationState: 'unsupported' as const,
      avatarUrl: userData.image?.link || null,
      original: userData,
      token: accessToken,
    }
  }

  async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Authorization', `Bearer ${accessToken}`)

    if (typeof callback === 'function') {
      callback(request)
    }

    const response = await request.get()
    let userData = response.data || response.body || response

    if (typeof userData === 'string') {
      try {
        userData = JSON.parse(userData)
      } catch (e) {
        throw new Error(`Failed to parse 42 API response as JSON: ${userData}`)
      }
    }

    if (!userData || typeof userData !== 'object') {
      throw new Error(`42 API returned no user data. Response status: ${response.status}`)
    }

    if (!userData.id) {
      throw new Error(
        `42 API returned invalid user data structure. User data: ${JSON.stringify(userData)}`
      )
    }

    return {
      id: userData.id,
      nickName: userData.login,
      name: userData.displayname || `${userData.first_name} ${userData.last_name}`,
      email: userData.email,
      emailVerificationState: 'unsupported' as const,
      avatarUrl: userData.image?.link || null,
      original: userData,
      token: { token: accessToken, type: 'bearer' },
    }
  }
}

/**
 * The factory function to reference the driver implementation
 * inside the "config/ally.ts" file.
 */
export function FortyTwoDriverService(
  config: FortyTwoDriverConfig
): (ctx: HttpContext) => FortyTwoDriver {
  return (ctx) => new FortyTwoDriver(ctx, config)
}
