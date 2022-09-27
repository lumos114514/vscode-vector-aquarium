import * as React from "react";
import { Color } from "./libs/core/Color";
import { Scene } from "./libs/core/Scene";
import { Vector2D } from "./libs/core/Vector2D";
import { FoodProvider } from "./libs/aquarium/FoodProvider";
import { Renderer } from "./libs/HtmlCanvasRenderer";
import { RippleServer } from "./libs/aquarium/RippleServer";
import { Canvas } from "./Canvas";
import { setting } from "./DefaultSetting";
import { Lophophorata } from "./libs/aquarium/Lophophorata";
import { Jellyfish } from "./libs/aquarium/Jellyfish";
import { Boid } from "./libs/aquarium/Boid";
import { Fish } from "./libs/aquarium/Fish";
import { MousePressedEvent } from "./libs/core/MouseEvent";

const colors = [
    "#3f51b5",
    "#2196f3",
    "#00bcd4",
    "#009688",
    "#4caf50",
    "#cddc39",
    "#ffeb3b",
    "#ffc107",
    "#ff9800",
    "#ff5722",
    "#f44336",
    "#e91e63",
    "#9c27b0"
]

const create = (context: CanvasRenderingContext2D, width: number, height: number) => {
    const scene = new Scene(width, height, new Renderer(context))
    scene.begin()
    return scene
}

const initScene = (scene: Scene) => {
    if (setting.isFoodEnabled) {
        scene.instantiate(new FoodProvider())
    }

    if (setting.isRippleEnabled) {
        scene.instantiate(new RippleServer())
    }

    for (const i of setting.lophophorata) {
        scene.instantiate(
            new Lophophorata(
                Color.fromColorCode(i.color ?? "#aaaaaa"),
                {
                    location: new Vector2D(i.location?.x ?? 0, i.location?.y ?? 0),
                    scale: i.scale ?? 1,
                    angle: i.angle ?? 0,
                }
            )
        )
    }

    for (const i of setting.jerryfish) {
        scene.instantiate(
            new Jellyfish(
                Color.fromColorCode(i.color ?? "#aaaaaa"),
                {
                    location: new Vector2D(i.location?.x ?? 0, i.location?.y ?? 0),
                    scale: i.scale ?? 1,
                    angle: i.angle ?? 0,
                }
            )
        )
    }

    for (const fishes of setting.fish) {
        const b = scene.instantiate(new Boid())
        for (const fish of fishes) {
            b.addBoid(
                scene.instantiate(
                    new Fish(
                        Color.fromColorCode(fish.color ?? "#aaaaaa"),
                        {
                            location: new Vector2D(
                                fish.location?.x ?? 0,
                                fish.location?.y ?? 0
                            ),
                            scale: fish.scale ?? 1,
                            angle: fish.angle ?? 0,
                        }
                    )
                )
            )
        }
    }
}

export const Main = () => {
    const [scene, setScene] = React.useState<Scene | null>(null);

    const handlePointerDown = (e: MousePressedEvent) => {
        scene?.press(e);
    };

    const handleInitialized = (context: CanvasRenderingContext2D, width: number, height: number) => {
        const scene = create(context, width, height);
        setScene(scene);
        initScene(scene);
    };

    return (
        <div
            style={{
                height: "100%",
                width: "100%"
            }}
        >
            <Canvas width={"100%"} height={"100%"}
                pointerDownHandler={handlePointerDown}
                resized={s => {
                    if (scene) {
                        scene.width = s.width;
                        scene.height = s.height;
                    }
                }}
                initialized={handleInitialized}
            />
        </div>
    );
};
