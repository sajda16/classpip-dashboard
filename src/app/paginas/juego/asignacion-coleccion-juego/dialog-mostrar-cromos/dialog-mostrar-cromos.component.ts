import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { ResponseContentType, Http, Response } from '@angular/http';

// Servicios

// Servicios
import { PeticionesAPIService } from '../../../../servicios/index';

// Clases
import { Coleccion, Cromo } from '../../../../clases/index';


@Component({
  selector: 'app-dialog-mostrar-cromos',
  templateUrl: './dialog-mostrar-cromos.component.html',
  styleUrls: ['./dialog-mostrar-cromos.component.scss']
})
export class DialogMostrarCromosComponent implements OnInit {

  coleccion: Coleccion;
  cromosColeccion: Cromo[];

  imagenesCromos: string[] = [];


  cromo: Cromo;




  constructor( public dialogRef: MatDialogRef<DialogMostrarCromosComponent>,
               @Inject(MAT_DIALOG_DATA) public data: any,
               private peticionesAPI: PeticionesAPIService,
               private http: Http) { }

  ngOnInit() {
    this.coleccion = this.data.coleccion;
    this.ObtenerCromos();
  }

  ObtenerCromos() {
    // Busca los cromos dela coleccion en la base de datos
    this.peticionesAPI.DameCromosColeccion(this.coleccion.id)
    .subscribe(res => {
      if (res[0] !== undefined) {
        this.cromosColeccion = res;
        console.log(res);

        this.DameImagenesCromos();
      } else {
        console.log('No hay cromos en esta coleccion');
        this.cromosColeccion = undefined;
      }
    });
  }
  // Busca la imagen que tiene el nombre del cromo.Imagen y lo carga en imagenCromo
  DameImagenesCromos() {

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < this.cromosColeccion.length; i++) {
    this.cromo = this.cromosColeccion[i];

    if (this.cromo.Imagen !== undefined ) {
      // Busca en la base de datos la imágen con el nombre registrado en equipo.FotoEquipo y la recupera
      this.http.get('http://localhost:3000/api/imagenes/ImagenCromo/download/' + this.cromo.Imagen,
      { responseType: ResponseContentType.Blob })
      .subscribe(response => {
        const blob = new Blob([response.blob()], { type: 'image/jpg'});

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          this.imagenesCromos[i] = reader.result.toString();
        }, false);

        if (blob) {
          reader.readAsDataURL(blob);
        }
    });
  }
    }
  }

}
