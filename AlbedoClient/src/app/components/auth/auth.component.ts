import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit {
  private readonly urlRegex: RegExp = new RegExp(':', 'g');
  authUrl: string = '';
  private scopes: Array<string> = [
    'moderator:read:followers',
    'channel:read:redemptions',
    'channel:manage:redemptions',
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<{ clientId: string }>('http://localhost:3000/api/client-id')
      .subscribe((response) => {
        const clientId = response.clientId;
        this.authUrl = this.createAuthUrl(
          clientId,
          'http://localhost:3000/api/authreturn',
          this.scopes
        );
      });
  }

  createAuthUrl(
    clientId: string,
    redirectURI: string,
    scopes: Array<string>
  ): string {
    const urlSafeScopes = scopes.join('+').replace(this.urlRegex, '%3A');
    let url = `https://id.twitch.tv/oauth2/authorize`;
    url += `?response_type=code`;
    url += `&client_id=${clientId}`;
    url += `&redirect_uri=${redirectURI}`;
    url += `&scope=${urlSafeScopes}`;
    return url;
  }
}
