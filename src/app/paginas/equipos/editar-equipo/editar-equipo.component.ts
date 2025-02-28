import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material';
import { AgregarAlumnoEquipoComponent } from '../agregar-alumno-equipo/agregar-alumno-equipo.component';
import { MoverAlumnoComponent } from './mover-alumno/mover-alumno.component';
import { ResponseContentType, Http } from '@angular/http';

// Clases
import { Equipo, Alumno, AsignacionEquipo } from '../../../clases/index';

// Servicios
import { SesionService, PeticionesAPIService, CalculosService } from '../../../servicios/index';

@Component({
  selector: 'app-editar-equipo',
  templateUrl: './editar-equipo.component.html',
  styleUrls: ['./editar-equipo.component.scss']
})
export class EditarEquipoComponent implements OnInit {

  // PONEMOS LAS COLUMNAS DE LA TABLA Y LA LISTA QUE TENDRÁ LA INFORMACIÓN QUE QUEREMOS MOSTRAR
  displayedColumns: string[] = ['nombreAlumno', 'primerApellido', 'segundoApellido', 'alumnoId', ' '];

  equipo: Equipo;
  alumnosEquipo: Alumno[];

  // NOS DEVUELVE LA RELACIÓN ENTRE UN ALUMNO Y UN EQUIPO
  asginacionEquipo: AsignacionEquipo[];

  // Recuperamos los alumnos del grupo
  alumnosGrupo: Alumno[];

  // Alumnos que ya estan asignados a un equipo. Debemos iniciarlo vacio para que vaya el push
  alumnosConEquipo: Alumno[] = [];

  // Lista con los alumnos del grupo que todavida no tienen equipo. Debemos iniciarlo vacio para que vaya el push
  alumnosSinEquipo: Alumno[] = [];

  // imagen
  imagenLogo: string;

  file: File;
  nombreLogo: string;
  nombreEquipo: string;

  // tslint:disable-next-line:ban-types
  logoCambiado: Boolean = false;

  constructor(
                public dialog: MatDialog,
                private location: Location,
                private sesion: SesionService,
                private calculos: CalculosService,
                private peticionesAPI: PeticionesAPIService,
                private http: Http ) { }

  ngOnInit() {
    this.equipo = this.sesion.DameEquipo();
    this.nombreEquipo = this.equipo.Nombre;
    this.alumnosEquipo = this.sesion.DameAlumnosEquipo();
    this.alumnosGrupo = this.sesion.DameAlumnosGrupo();

    // Cargo el logo
    this.GET_Logo();
    // Pedimos las listas de alumnos con y sin equipo
    this.calculos.DameListasAlumnosConYSinEquipo (this.equipo, this.alumnosGrupo)
    .subscribe (res => {
                          this.alumnosConEquipo = res.con;
                          this.alumnosSinEquipo = res.sin;
    });
  }

  // Busca el logo que tiene el nombre del equipo.FotoEquipo y lo carga en imagenLogo
  GET_Logo() {

    if (this.equipo.FotoEquipo !== undefined ) {
      this.http.get('http://localhost:3000/api/imagenes/LogosEquipos/download/' + this.equipo.FotoEquipo,
      { responseType: ResponseContentType.Blob })
      .subscribe(response => {

        const blob = new Blob([response.blob()], { type: 'image/jpg'});

        const reader = new FileReader();
        reader.addEventListener('load', () => {
          this.imagenLogo = reader.result.toString();
          // La necesitaremos al regresar para actualizar el logo en la lista que ve el usuario
          this.sesion.TomaImagenLogoEquipo (this.imagenLogo);
        }, false);

        if (blob) {
          reader.readAsDataURL(blob);
        }
      });
    }

  }

// LE PASAMOS EL IDENTIFICADOR DEL EQUIPO Y BUSCAMOS LOS ALUMNOS QUE TIENE. LA UTILIZAMOS PARA ACTUALIZAR LA TABLA
  AlumnosDelEquipo(equipoId: number) {

    this.peticionesAPI.DameAlumnosEquipo(equipoId)
    .subscribe(res => {
    if (res[0] !== undefined) {
      this.alumnosEquipo = res;
    } else {
      // Mensaje al usuario
      console.log('No hay alumnos en este grupo');
      this.alumnosEquipo = undefined;
      }
    });
  }

  BorrarAlumnoEquipo(alumno: Alumno) {
    console.log('voy a borrar a ' + alumno.id);
    // PRIMERO BUSCO LA ASIGNACIÓN QUE VINCULA EL ALUMNO CON ID QUE PASO COMO PARÁMETRO Y EL EQUIPO EN EL QUE ESTOY
    this.peticionesAPI.DameAsignacionEquipoAlumno (alumno.id, this.equipo.id, this.equipo.grupoId)
    .subscribe(asignacion => {
      console.log(asignacion);

      // UNA VEZ LO TENGO, BORRO ESA ASIGNACIÓN Y, POR TANTO, EL VÍNCULO ENTRE ALUMNO Y EQUIPO
      if (asignacion[0] !== undefined) {
        this.peticionesAPI.BorraAlumnoEquipo(asignacion[0]).subscribe(res => {
          console.log(res);
          // SI SE BORRA CORRECTAMENTE NOS DEVUELVE NULL
          if (res === null) {
            console.log('eliminado correctamente');
            this.AlumnosDelEquipo(this.equipo.id); // Actualizados los alumnos del equipo
            // Actualizamos las listas de alumnos del grupo con y sin equipo
            this.alumnosConEquipo = this.alumnosConEquipo.filter(result => result.id !== alumno.id);
            this.alumnosSinEquipo.push(alumno);
          } else {
            console.log('No se ha podido eliminar');
          }
        });
      } else {
        console.log('no se ha encontrado la asignación');
        }
      });
  }

  // SE ABRE EL DIÁLOGO PARA AÑADIR ALUMNOS AL EQUIPO
  AbrirDialogoAgregarAlumnosEquipo(): void {

    const dialogRef = this.dialog.open(AgregarAlumnoEquipoComponent, {
      maxHeight: '95%',
      maxWidth: '50%',

      // LE ENVIAMOS LOS ALUMNOS QUE TIENE ACTUALMENTE EL EQUIPO Y LOS QUE PODEMOS AÑADIR, ADEMÁS DEL EQUIPO QUE NOS SERÁ
      // ÚTIL PARA SABER SU ID Y EL ID DEL GRUPO AL QUE PERTENCE
      data: {
        alumnosEquipo: this.alumnosEquipo,
        alumnosSinEquipo: this.alumnosSinEquipo,
        equipo: this.equipo
      }
    });

    // RECUPERAREMOS LA NUEVA LISTA DE LOS ALUMNOS ASIGNABLES Y VOLVEREMOS A BUSCAR LOS ALUMNOS QUE TIENE EL EQUIPO
    dialogRef.afterClosed().subscribe(alumnosEquipo => {

      // Si el usuario clica a aceptar para cerrar el dialogo, se enviarán los alumnos del equipo
      if (alumnosEquipo !== undefined) {
        this.alumnosEquipo = alumnosEquipo;

        // Si clica fuera del diálogo para cerrarlo, recuperaremos la lista de la base de datos
      } else {
        this.AlumnosDelEquipo(this.equipo.id);
      }

      // Limpiamos las listas que teniamos antes
      this.alumnosConEquipo = [];
      this.alumnosSinEquipo = [];

      // Pedimos las listas de alumnos con y sin equipo
      this.calculos.DameListasAlumnosConYSinEquipo (this.equipo, this.alumnosGrupo)
      .subscribe (res => {
                            this.alumnosConEquipo = res.con;
                            this.alumnosSinEquipo = res.sin;
      });

    });
 }


  // NOS PERMITE MODIFICAR EL NOMBRE Y EL LOGO DEL EQUIPO
  EditarEquipo() {

    this.peticionesAPI.ModificaEquipo(new Equipo(this.nombreEquipo, this.nombreLogo), this.equipo.grupoId, this.equipo.id)
    .subscribe((res) => {
      if (res != null) {

        this.equipo = res;

        if (this.logoCambiado === true) {
          // HACEMOS EL POST DE LA NUEVA IMAGEN EN LA BASE DE DATOS
          const formData: FormData = new FormData();
          formData.append(this.nombreLogo, this.file);
          this.peticionesAPI.PonLogoEquipo(formData)
          .subscribe(() => console.log('Logo cargado'));
        }


      } else {
        console.log('fallo editando');
      }
    });
    this.goBack();
  }

  // AL CLICAR EN AGREGAR LOGO NOS ACTIVARÁ LA FUNCIÓN MOSTRAR DE ABAJO
  ActivarInput() {
    console.log('Activar input');
    document.getElementById('input').click();
  }


   // Seleccionamos una foto y guarda el nombre de la foto en la variable logo
  Mostrar($event) {
    this.file = $event.target.files[0];

    console.log('fichero ' + this.file.name);
    this.nombreLogo = this.file.name;

    const reader = new FileReader();
    reader.readAsDataURL(this.file);
    reader.onload = () => {
      console.log('ya');
      this.logoCambiado = true;
      this.imagenLogo = reader.result.toString();
    };
  }


  // MOVER ALUMNO
  // SE ABRE EL DIÁLOGO PARA AÑADIR ALUMNOS AL EQUIPO
  AbrirDialogoMoverAlumno(): void {

    const dialogRef = this.dialog.open(MoverAlumnoComponent, {
      maxHeight: '95%',
      maxWidth: '50vw',

      // LE ENVIAMOS LOS ALUMNOS QUE TIENE ACTUALMENTE EL EQUIPO Y LOS QUE PODEMOS AÑADIR, ADEMÁS DEL EQUIPO QUE NOS SERÁ
      // ÚTIL PARA SABER SU ID Y EL ID DEL GRUPO AL QUE PERTENCE
      data: {
        alumnosEquipo: this.alumnosEquipo,
        equipo: this.equipo
      }
    });

    // RECUPERAREMOS LA NUEVA LISTA DE LOS ALUMNOS ASIGNABLES Y VOLVEREMOS A BUSCAR LOS ALUMNOS QUE TIENE EL EQUIPO
    dialogRef.afterClosed().subscribe(alumnosEquipo => {

      // Si el usuario clica a aceptar para cerrar el dialogo, se enviarán los alumnos del equipo
      if (alumnosEquipo !== undefined) {
        this.alumnosEquipo = alumnosEquipo;

        // Si clica fuera del diálogo para cerrarlo, recuperaremos la lista de la base de datos
      } else {
        this.AlumnosDelEquipo(this.equipo.id);
      }

      // Limpiamos las listas que teniamos antes
      this.alumnosConEquipo = [];
      this.alumnosSinEquipo = [];
      // Pedimos las listas de alumnos con y sin equipo
      this.calculos.DameListasAlumnosConYSinEquipo (this.equipo, this.alumnosGrupo)
      .subscribe (res => {
                            this.alumnosConEquipo = res.con;
                            this.alumnosSinEquipo = res.sin;
      });
    });
  }

  // NOS DEVOLVERÁ A LA DE LA QUE VENIMOS
  goBack() {
    this.location.back();
  }
}
