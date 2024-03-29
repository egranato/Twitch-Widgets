import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlertsComponent } from './components/alerts/alerts.component';

import { AuthComponent } from './components/auth/auth.component';
import { ChatComponent } from './components/chat/chat.component';
import { DisplayComponent } from './components/display/display.component';
import { PointRedemptionsComponent } from './components/point-redemptions/point-redemptions.component';
import { FullComponent } from './components/full/full.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
  },
  {
    path: 'chat',
    component: ChatComponent,
  },
  {
    path: 'redemptions',
    component: PointRedemptionsComponent,
  },
  {
    path: 'alerts',
    component: AlertsComponent,
  },
  {
    path: 'display',
    component: DisplayComponent,
  },
  {
    path: 'auth',
    component: AuthComponent,
  },
  {
    path: 'full',
    component: FullComponent,
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
