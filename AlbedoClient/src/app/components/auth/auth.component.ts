import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit {
  authUrl: string = '';
  private scopes: Array<string> = ['moderator:read:followers'];

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
    let url = `https://id.twitch.tv/oauth2/authorize`;
    url += `?response_type=code`;
    url += `&client_id=${clientId}`;
    url += `&redirect_uri=${redirectURI}`;
    url += `&scope=${scopes.join(' ')}`;
    return url;
  }
}
