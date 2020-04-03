import {Injectable, Optional} from '@angular/core';

import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import {Observable, of, merge} from 'rxjs';
import {
  catchError,
  filter,
  map,
  take,
  mergeMap,
  timeout
} from 'rxjs/operators';
import {OAuthModuleConfig, OAuthResourceServerErrorHandler, OAuthService, OAuthStorage} from 'angular-oauth2-oidc';

@Injectable()
export class DefaultOAuthInterceptor implements HttpInterceptor {
  constructor(
    private authStorage: OAuthStorage,
    private oAuthService: OAuthService,
    private errorHandler: OAuthResourceServerErrorHandler,
    @Optional() private moduleConfig: OAuthModuleConfig
  ) {
  }

  private checkUrl(url: string): boolean {
    if (this.moduleConfig.resourceServer.customUrlValidation) {
      return this.moduleConfig.resourceServer.customUrlValidation(url);
    }

    if (this.moduleConfig.resourceServer.allowedUrls) {
      return !!this.moduleConfig.resourceServer.allowedUrls.find(u =>
        url.startsWith(u)
      );
    }

    return true;
  }

  public intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const url = req.url.toLowerCase();

    // if (
    //   !this.moduleConfig ||
    //   !this.moduleConfig.resourceServer ||
    //   !this.checkUrl(url)
    // ) {
    //   return next.handle(req);
    // }

    const sendAccessToken = this.moduleConfig.resourceServer.sendAccessToken;

    if (!sendAccessToken) {
      return next
        .handle(req)
        .pipe(catchError(err => this.errorHandler.handleError(err)));
    }

    return merge(
      of(this.oAuthService.getAccessToken()).pipe(
        filter(token => (token ? true : false))
      ),
      this.oAuthService.events.pipe(
        filter(e => e.type === 'token_received'),
        timeout(this.oAuthService.waitForTokenInMsec || 0),
        catchError(_ => of(null)), // timeout is not an error
        map(_ => this.oAuthService.getAccessToken())
      )
    ).pipe(
      take(1),
      mergeMap(token => {
        if (token) {
          const header = 'Bearer ' + token;
          const headers = req.headers.set('Authorization', header);
          req = req.clone({headers});
        }

        return next
          .handle(req)
          .pipe(catchError(err => this.errorHandler.handleError(err)));
      })
    );
  }
}

// import { Injectable, Inject, Optional } from '@angular/core';
// import {OAuthModuleConfig, OAuthResourceServerErrorHandler, OAuthService, OAuthStorage} from 'angular-oauth2-oidc';
// import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
//
// import {from, Observable} from 'rxjs';
//
// @Injectable()
// export class DefaultOAuthInterceptor implements HttpInterceptor {
//
//   constructor(
//     private authStorage: OAuthStorage,
//     private oauthService: OAuthService,
//     private errorHandler: OAuthResourceServerErrorHandler,
//     @Optional() private moduleConfig: OAuthModuleConfig
//   ) {
//   }
//
//   private checkUrl(url: string): boolean {
//     const found = this.moduleConfig.resourceServer.allowedUrls.find(u => url.startsWith(u));
//     return !!found;
//   }
//
//   public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//
//     console.log('INTERCEPTOR');
//
//     const url = req.url.toLowerCase();
//
//     if (!this.moduleConfig) { return next.handle(req); }
//     if (!this.moduleConfig.resourceServer) { return next.handle(req); }
//     if (!this.moduleConfig.resourceServer.allowedUrls) { return next.handle(req); }
//     if (!this.checkUrl(url)) { return next.handle(req); }
//
//     const sendAccessToken = this.moduleConfig.resourceServer.sendAccessToken;
//
//     if (sendAccessToken) {
//
//       // const token = this.authStorage.getItem('access_token');
//       const token = this.oauthService.getIdToken();
//       const header = 'Bearer ' + token;
//
//       console.log('TOKEN in INTERCEPTOR : ' + token);
//
//       const headers = req.headers
//         .set('Authorization', header);
//
//       req = req.clone({ headers });
//     }
//
//     return next.handle(req)/*.catch(err => this.errorHandler.handleError(err))*/;
//
//   }
//
//   // constructor(private oAuthService: OAuthService) {
//   // }
//   //
//   // intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//   //   return from(this.handleAccess(request, next));
//   // }
//   //
//   // private async handleAccess(request: HttpRequest<any>, next: HttpHandler): Promise<HttpEvent<any>> {
//   //   // Only add an access token to whitelisted origins
//   //   const allowedOrigins = ['*'];
//   //   if (allowedOrigins.some(url => request.urlWithParams.includes(url))) {
//   //     const accessToken = await this.oAuthService.getAccessToken();
//   //     request = request.clone({
//   //       setHeaders: {
//   //         Authorization: 'Bearer ' + accessToken
//   //       }
//   //     });
//   //   }
//   //   return next.handle(request).toPromise();
//   // }
// }