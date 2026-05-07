import Link from "next/link";

export default function MunicipioNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <h1 className="text-2xl font-bold">Municipio no encontrado</h1>
      <p className="mt-2 text-muted-foreground">
        No encontramos un municipio con ese código en la Provincia de Buenos
        Aires. Puede que el ID esté mal tipeado o que el municipio aún no
        exista en nuestros registros.
      </p>
      <Link
        href="/municipios"
        className="mt-4 inline-block text-primary hover:underline"
      >
        Volver a municipios
      </Link>
    </div>
  );
}
